import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { loginSchema } from "../../schemas/authSchemas";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      const payload = {
        email: values.email,
        password: values.password,
      };

      const session = await login(payload);
      toast.success("Dang nhap thanh cong.");
      const role = session.roles?.[0];

      if (role) {
        navigate(`/dashboard/${role}`);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Dang nhap that bai.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Auth</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Dang nhap</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Ho tro dang nhap bang email de dam bao khoi phuc tai khoan nhat quan theo gmail.
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
          label="Mat khau"
          type="password"
          placeholder="******"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Dang nhap
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <Link to="/auth/forgot-password" className="font-medium text-sky-700 hover:text-sky-900">
          Quen mat khau
        </Link>
        <Link to="/auth/register" className="font-medium text-sky-700 hover:text-sky-900">
          Tao tai khoan
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;
