import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Business Client",
    role: "Managing Director",
    company: "Private Company",
    text: "Kivu Advisory helped us organize our accounting records and understand our tax obligations more clearly.",
  },
  {
    name: "Institution Client",
    role: "Finance Officer",
    company: "Local Institution",
    text: "The service was professional, confidential, and clear. We appreciated the structured document follow-up.",
  },
  {
    name: "Entrepreneur Client",
    role: "Founder",
    company: "Small Business",
    text: "Their advisory support helped us improve how we manage finances, reports, and business planning.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-softwhite py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
            Client Testimonials
          </p>

          <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
            What Our Clients Say
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-gray-100 bg-lightgray p-6"
            >
              <div className="mb-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={14}
                    className="fill-gold text-gold"
                  />
                ))}
              </div>

              <blockquote className="mb-5 text-sm italic leading-relaxed text-gray-700">
                &ldquo;{item.text}&rdquo;
              </blockquote>

              <div>
                <p className="text-sm font-bold text-navy">{item.name}</p>

                <p className="text-xs text-gray-500">
                  {item.role} — {item.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}