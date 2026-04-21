import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../hooks/useAuth";
import { resolveDashboardRole } from "../../store/authStore";
import { useToast } from "../../hooks/useToast";
import { loginSchema } from "../../schemas/authSchemas";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const emailValue = watch("email");
  const forgotPasswordTarget = emailValue?.trim()
    ? `/auth/forgot-password?email=${encodeURIComponent(emailValue.trim())}`
    : "/auth/forgot-password";

  const onSubmit = async (values) => {
    try {
      clearErrors("password");
      const payload = {
        email: values.email,
        password: values.password,
      };

      const session = await login(payload);
      toast.success("Đăng nhập thành công.");
      const role = resolveDashboardRole(session.currentUser, session.roles);

      if (role) {
        navigate(`/dashboard/${role}`);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      const status = error.response?.status;
      const rawMessage = error.response?.data?.message || "Đăng nhập thất bại.";
      const normalizedMessage = String(rawMessage).toLowerCase();
      const isInvalidCredentials =
        status === 401 &&
        (normalizedMessage.includes("invalid credentials") ||
          normalizedMessage.includes("incorrect password") ||
          normalizedMessage.includes("sai mật khẩu") ||
          normalizedMessage.includes("sai mat khau"));
      const message = isInvalidCredentials ? "Email hoặc mật khẩu không đúng." : rawMessage;

      if (
        status === 403 &&
        (normalizedMessage.includes("locked") || normalizedMessage.includes("khóa"))
      ) {
        navigate("/unauthorized", {
          replace: true,
          state: {
            reason: "locked",
          },
        });
        return;
      }

      if (isInvalidCredentials) {
        setError("password", {
          type: "server",
          message,
        });
      }

      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Auth</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Đăng nhập</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Hỗ trợ đăng nhập bằng email để đảm bảo khôi phục tài khoản nhất quán theo Gmail.
        </p>
      </div>
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Email"
          placeholder="admin.test@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Mật khẩu"
          type="password"
          placeholder="******"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Đăng nhập
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <Link to={forgotPasswordTarget} className="font-medium text-sky-700 hover:text-sky-900">
          Quên mật khẩu
        </Link>
        <Link to="/auth/register" className="font-medium text-sky-700 hover:text-sky-900">
          Tạo tài khoản
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;
