import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../../api/productApi";
import Button from "../../components/common/Button";
import CategoryMenu from "../../components/common/CategoryMenu";
import EmptyState from "../../components/common/EmptyState";
import ProductCard from "../../components/product/ProductCard";
import FAQAccordion from "../../components/storefront/FAQAccordion";
import SectionIntro from "../../components/storefront/SectionIntro";
import { mapProductDto } from "../../lib/apiMappers";

const TOP_SHOPS_LIMIT = 3;
const FEATURED_PRODUCTS_LIMIT = 4;

function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const response = await getProducts();
        if (!active) {
          return;
        }
        setProducts((response || []).map(mapProductDto));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được sản phẩm.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const featuredProducts = useMemo(
    () =>
      [...products]
        .sort((left, right) => {
          if ((right.sold || 0) !== (left.sold || 0)) {
            return (right.sold || 0) - (left.sold || 0);
          }

          return (right.review_count || 0) - (left.review_count || 0);
        })
        .slice(0, FEATURED_PRODUCTS_LIMIT),
    [products],
  );
  const heroBannerProducts = useMemo(() => products.slice(0, 3), [products]);

  const categories = useMemo(() => {
    const counts = new Map();
    products.forEach((product) => {
      counts.set(product.category, (counts.get(product.category) || 0) + 1);
    });

    return [...counts.entries()].slice(0, 6).map(([name, count]) => ({
      name,
      label: `${name} (${count})`,
      value: name,
    }));
  }, [products]);

  const topShops = useMemo(() => {
    const shops = new Map();

    products.forEach((product) => {
      const existing = shops.get(product.seller_name) || {
        id: product.seller_name,
        name: product.seller_name,
        specialty: product.category,
        productCount: 0,
      };
      existing.productCount += 1;
      shops.set(product.seller_name, existing);
    });

    return [...shops.values()]
      .sort((a, b) => {
        if (b.productCount !== a.productCount) {
          return b.productCount - a.productCount;
        }

        return a.name.localeCompare(b.name, "vi");
      })
      .slice(0, TOP_SHOPS_LIMIT);
  }, [products]);

  const faqItems = useMemo(
    () => [
      {
        group: "Nền tảng",
        question: "Website này hoạt động như thế nào?",
        answer:
          "Seller đăng ký và tạo sản phẩm, affiliate lấy link riêng để quảng bá, customer mua hàng, seller xác nhận đã nhận tiền, sau đó hệ thống mới ghi nhận commission và phí nền tảng.",
      },
      {
        group: "Affiliate",
        question: "Khi nào affiliate được tính hoa hồng?",
        answer:
          "Commission chỉ được duyệt khi đơn hàng thành công và seller xác nhận đã nhận tiền. Đây là logic minh bạch để hạn chế đơn ảo và tránh tranh chấp.",
      },
      {
        group: "Seller",
        question: "Seller có phải trả trước chi phí quảng cáo không?",
        answer:
          "Không. Seller tự đặt tỷ lệ commission và chỉ phát sinh chi phí khi có đơn hợp lệ đủ điều kiện ghi nhận.",
      },
      {
        group: "Buyer",
        question: "Customer có cần tài khoản để mua hàng không?",
        answer:
          "Hệ thống ưu tiên trải nghiệm có tài khoản để theo dõi giỏ hàng, thanh toán và lịch sử đơn, nhưng giao diện public vẫn dẫn người mua vào các bước mua hàng rất rõ ràng.",
      },
    ],
    [],
  );

  const testimonials = useMemo(
    () => [
      {
        name: "Lan Hương",
        role: "Seller mỹ phẩm",
        quote:
          "Mình có thể tự đặt commission theo từng sản phẩm và chỉ chi phí khi đơn hàng thành công. Dashboard rất dễ theo dõi.",
      },
      {
        name: "Minh Quân",
        role: "Affiliate review công nghệ",
        quote:
          "Marketplace rõ thông tin hoa hồng, sản phẩm nào được duyệt là thấy ngay. Link riêng và doanh thu theo dõi rất nhanh.",
      },
      {
        name: "Bảo Ngọc",
        role: "Khách mua hàng",
        quote:
          "Trang sản phẩm dễ xem, shop rõ ràng, mua hàng và theo dõi trạng thái đơn khá mượt trên điện thoại.",
      },
    ],
    [],
  );

  const trustPoints = useMemo(
    () => [
      "Seller được admin kiểm duyệt trước khi bán hàng.",
      "Affiliate được duyệt trước khi tạo và sử dụng link tiếp thị.",
      "Sản phẩm tham gia affiliate cần qua bước duyệt riêng.",
      "Commission chỉ ghi nhận khi đơn thành công và seller xác nhận nhận tiền.",
    ],
    [],
  );

  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-[2.5rem] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f4fbff_55%,#eef8ff_100%)] px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-10 sm:py-10">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-stretch">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-800">Tổng quan sản phẩm</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                Xem nhanh sản phẩm nổi bật, danh mục và shop đang hiển thị trên .
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
                Khung này tập trung vào hàng hóa đang bán thực tế. Người mua có thể quét nhanh ảnh banner,
                giá, danh mục và đi thẳng vào trang sản phẩm mà không bị các khối onboarding dư thừa.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <HeroMetric label="Sản phẩm đang hiển thị" value={products.length} detail="Số sản phẩm đã được đưa lên marketplace." dark />
              <HeroMetric label="Danh mục hoạt động" value={categories.length} detail="Số nhóm sản phẩm có dữ liệu hiển thị." />
              <HeroMetric label="Shop đang bán" value={topShops.length} detail="Top shop đang có sản phẩm được duyệt." />
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Bộ lọc nhanh</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Khám phá toàn bộ sản phẩm theo danh mục</h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to="/products">
                    <Button size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">Sản phẩm</Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="secondary" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
                      Đăng nhập
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mt-5">
                <CategoryMenu categories={categories} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <HeroBannerCard product={heroBannerProducts[0]} size="large" />
            <div className="grid gap-4">
              <HeroBannerCard product={heroBannerProducts[1]} />
              <HeroBannerCard product={heroBannerProducts[2]} compact />
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur lg:col-span-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.26em] text-cyan-700">Tổng hợp nhanh</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Sản phẩm mới, shop nổi bật và ảnh banner nằm trong cùng một khung</h2>
                </div>
                <Link to="/products" className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-800">
                  Xem danh sách đầy đủ
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  `${featuredProducts.length || 0} sản phẩm nổi bật đang được ưu tiên hiển thị ở trang chủ.`,
                  `${topShops.length || 0} shop có sản phẩm được duyệt và hiện trên marketplace.`,
                  "Ảnh banner và khung tổng hợp được ưu tiên để người mua quét nhanh sản phẩm trên trang chủ.",
                ].map((item) => (
                  <div key={item} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading ? <LoadingBlock /> : null}
      {!loading && error ? <EmptyState title="Không tải được dữ liệu" description={error} /> : null}

      {!loading && !error ? (
        <>
          <section className="space-y-6">
            <SectionIntro
              eyebrow="Nền tảng"
              title="Một marketplace trung gian giúp Seller, Affiliate và Customer làm việc rõ ràng hơn"
              description="Seller tự đặt hoa hồng theo sản phẩm. Admin kiểm duyệt seller, affiliate và sản phẩm."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <RoleCard
                title="Dành cho seller"
                description="Đăng sản phẩm, đặt commission linh hoạt, chỉ chi trả khi đơn hàng thành công."
                ctaLabel="Mở kênh bán hàng"
                to="/seller/dashboard"
                accent="emerald"
              />
              <RoleCard
                title="Dành cho affiliate"
                description="Chọn sản phẩm phù hợp, tạo link cá nhân và theo dõi click, đơn, commission theo thời gian."
                ctaLabel="Tham gia tiếp thị"
                to="/affiliate/dashboard"
                accent="cyan"
              />
              <RoleCard
                title="Dành cho khách hàng"
                description="Tìm sản phẩm nhanh, xem shop rõ ràng và mua hàng trong một luồng ecommerce quen thuộc."
                ctaLabel="Xem sản phẩm"
                to="/products"
                accent="slate"
              />
            </div>
          </section>

          <section className="space-y-6">
            <SectionIntro
              eyebrow="Nổi bật"
              title="Sản phẩm nổi bật"
              description="Hiển thị theo phong cách ecommerce, rõ giá, shop và trạng thái affiliate."
              action={
                <Link to="/products">
                  <Button variant="outline">Xem tất cả</Button>
                </Link>
              }
            />
            <div className="grid gap-6 lg:grid-cols-2">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <SectionIntro
              eyebrow="Minh bạch"
              title="Quy trình duyệt và ghi nhận được hiển thị rõ trên giao diện"
              description="Public UI nhấn mạnh tính kiểm duyệt và logic nghiệp vụ để tạo niềm tin cho seller, affiliate và người mua."
            />
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                {trustPoints.map((item) => (
                  <div key={item} className="rounded-[2rem] border border-slate-300 bg-white p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Verified Flow</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[2.25rem] bg-[linear-gradient(180deg,#0f172a_0%,#132b45_100%)] p-8 text-white shadow-sm">
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">Cách hệ thống hoạt động</p>
                <div className="mt-6 space-y-4">
                  {[
                    "Seller đăng ký, chờ duyệt và đăng sản phẩm cùng mức hoa hồng.",
                    "Affiliate chọn sản phẩm phù hợp và lấy link riêng để quảng bá.",
                    "Customer đặt hàng, seller xác nhận nhận tiền, hệ thống duyệt commission và phí nền tảng.",
                  ].map((item, index) => (
                    <div key={item} className="flex gap-4 rounded-[1.5rem] bg-white/8 p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 font-semibold">
                        0{index + 1}
                      </span>
                      <p className="text-sm leading-7 text-slate-200">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2.25rem] border border-slate-300 bg-white p-8 shadow-sm">
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-700">Đặc biệt cho seller</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Seller quản lý shop, sản phẩm và doanh thu trong dashboard riêng</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Tự tạo sản phẩm, chỉnh commission, theo dõi order affiliate đến xác nhận nhận tiền.
              </p>
              <Link to="/seller/dashboard" className="mt-6 inline-block">
                <Button>Vào seller dashboard</Button>
              </Link>
            </div>
            <div className="rounded-[2.25rem] bg-[linear-gradient(160deg,#0f172a_0%,#10243d_100%)] px-8 py-8 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-200">Dành cho affiliate</p>
              <h2 className="mt-3 text-3xl font-semibold">Lấy link, theo dõi commission và rút tiền</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                KPI, bảng commission và lịch sử payout được tổ chức theo kiểu SaaS dashboard để quét nhanh.
              </p>
              <Link to="/affiliate/dashboard" className="mt-6 inline-block">
                <Button>Vào affiliate dashboard</Button>
              </Link>
            </div>
          </section>

          <section className="space-y-6">
            <SectionIntro
              eyebrow="Top shop"
              title="Có nhiều sản phẩm"

            />
            <div className="grid gap-4 md:grid-cols-3">
              {topShops.map((shop) => (
                <div key={shop.id} className="rounded-[2rem] border border-slate-300 bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-semibold text-slate-900">{shop.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{shop.productCount} sản phẩm đang hiển thị trong marketplace.</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <SectionIntro
              eyebrow="Feedback"
              title="Seller, affiliate và buyer nhìn thấy gì?"

            />
            <div className="grid gap-4 lg:grid-cols-3">
              {testimonials.map((item) => (
                <div key={item.name} className="rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
                  <p className="text-sm leading-7 text-slate-600">"{item.quote}"</p>
                  <div className="mt-5">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <SectionIntro
                eyebrow="FAQ"
                title="Những câu hỏi thường gặp"

              />
              <FAQAccordion items={faqItems} />
            </div>
            <div className="rounded-[2.5rem] border border-sky-300 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] p-8 shadow-sm">
              <p className="text-xs uppercase tracking-[0.32em] text-sky-800">Sẵn sàng bắt đầu</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Bạn muốn bán hàng, quảng bá hay mua sản phẩm ngay hôm nay?</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Trang chủ được thiết kế để dẫn người dùng vào hành động chính nhanh hơn, đồng thời vẫn
                giữ rõ nghiệp vụ và tính minh bạch của hệ thống.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to="/register">
                  <Button size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">Đăng ký ngay</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="secondary" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/products">
                  <Button size="lg" variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50">
                    Xem marketplace
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function HeroMetric({ label, value, detail, dark = false }) {
  return (
    <div className={dark ? "rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-lg" : "rounded-[2rem] border border-slate-300 bg-white p-6 shadow-lg"}>
      <p className={dark ? "text-sm font-medium text-sky-200" : "text-sm font-medium text-slate-600"}>{label}</p>
      <p className={dark ? "mt-3 text-3xl font-semibold" : "mt-3 text-3xl font-semibold text-slate-900"}>{value}</p>
      <p className={dark ? "mt-3 text-sm leading-7 text-slate-200" : "mt-3 text-sm leading-7 text-slate-700"}>{detail}</p>
    </div>
  );
}

function HeroBannerCard({ product, size = "default", compact = false }) {
  const isLarge = size === "large";
  const image = product?.image;
  const title = product?.name || (isLarge ? "Bộ sưu tập sản phẩm nổi bật" : "Banner sản phẩm");
  const category = product?.category || "Marketplace";
  const sellerName = product?.seller_name || "Đang cập nhật";
  const description = product?.description || "Hình ảnh banner sẽ ưu tiên lấy từ sản phẩm thật để khung tổng quan không bị trống.";

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[2rem] border border-slate-200 shadow-sm",
        isLarge ? "min-h-[420px] lg:row-span-2" : compact ? "min-h-[190px]" : "min-h-[210px]",
        image ? "bg-slate-900" : "bg-[linear-gradient(135deg,#0f172a_0%,#155e75_55%,#0f766e_100%)]",
      ].join(" ")}
    >
      {image ? <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" /> : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.10)_0%,rgba(15,23,42,0.78)_100%)]" />
      <div className="relative flex h-full flex-col justify-end p-5 text-white sm:p-6">
        <div className="max-w-[28rem] rounded-[1.5rem] bg-slate-950/50 p-4 backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">{category}</p>
          <h3 className={isLarge ? "mt-3 text-3xl font-semibold leading-tight" : "mt-3 text-xl font-semibold leading-snug"}>{title}</h3>
          <p className="mt-2 text-sm text-slate-200">Shop: {sellerName}</p>
          {!compact ? <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-200">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}

function LoadingBlock() {
  return <div className="rounded-[2rem] border border-slate-300 bg-white p-8 text-sm text-slate-700 shadow-sm">Đang tải dữ liệu từ database...</div>;
}

function RoleCard({ title, description, ctaLabel, to, accent }) {
  const accentClasses = {
    emerald: "text-emerald-700 bg-emerald-50",
    cyan: "text-cyan-700 bg-cyan-50",
    slate: "text-slate-700 bg-slate-100",
  };

  return (
    <div className="rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm">
      <div className={["inline-flex rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em]", accentClasses[accent]].join(" ")}>
        {title}
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">{description}</p>
      <Link to={to} className="mt-5 inline-flex text-sm font-semibold text-slate-900 transition hover:text-cyan-700">
        {ctaLabel}
      </Link>
    </div>
  );
}

export default HomePage;
