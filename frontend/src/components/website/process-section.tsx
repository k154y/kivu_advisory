const steps = [
  {
    step: "01",
    title: "Submit Your Request",
    desc: "Choose the service you need and describe your accounting, tax, payroll, audit, or advisory requirement.",
  },
  {
    step: "02",
    title: "Share Documents",
    desc: "Upload or provide the documents required for review through the client portal or during consultation.",
  },
  {
    step: "03",
    title: "Professional Review",
    desc: "Our team reviews your request, asks for clarification where needed, and works on the service.",
  },
  {
    step: "04",
    title: "Receive Delivery",
    desc: "You receive completed work, feedback, reports, or advisory support through a clear communication process.",
  },
];

export function ProcessSection() {
  return (
    <section className="bg-lightgray py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
            How It Works
          </p>

          <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
            Simple 4-Step Process
          </h2>

          <p className="mx-auto max-w-xl text-gray-600">
            From your first request to delivery of completed work — our process
            is clear, professional, and client-focused.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              {index < steps.length - 1 ? (
                <div
                  className="absolute top-8 z-0 hidden h-px bg-gray-200 lg:block"
                  style={{
                    width: "calc(100% - 2rem)",
                    left: "calc(50% + 2rem)",
                  }}
                />
              ) : null}

              <div className="relative z-10 rounded-xl border border-gray-100 bg-softwhite p-6">
                <div className="mb-3 text-3xl font-bold text-gold/30">
                  {item.step}
                </div>

                <h3 className="mb-2 font-bold text-navy">{item.title}</h3>

                <p className="text-sm leading-relaxed text-gray-600">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}