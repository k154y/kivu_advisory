"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  FileText,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import { PublicLayout } from "@/components/layout/public-layout";
import {
  getContentText,
  getSectionContentBlocks,
} from "@/lib/website-content";

const fallbackAbout = {
  title: "Professional accounting, tax, audit, and business advisory support.",
  intro:
    "Kivu Advisory supports businesses, institutions, entrepreneurs, and organizations with reliable financial services, practical advice, and organized client communication.",
  mission:
    "Through the client portal, clients can submit service requests, upload documents, exchange messages, and follow progress in a structured and professional way.",
  values:
    "Confidential handling of client information, Clear accounting and tax support, Professional reporting and documentation, Practical advisory for business decisions",
};

const focusAreas = [
  {
    icon: FileText,
    title: "Accounting & Tax",
    desc: "We help clients keep organized records, prepare declarations, and stay compliant.",
  },
  {
    icon: ShieldCheck,
    title: "Audit & Compliance",
    desc: "We support audit preparation, internal controls, documentation, and compliance review.",
  },
  {
    icon: TrendingUp,
    title: "Business Advisory",
    desc: "We help businesses understand financial information and improve decision-making.",
  },
  {
    icon: Users,
    title: "Client Support",
    desc: "We use a structured workflow for requests, documents, messages, and service follow-up.",
  },
];

function splitValues(value: string) {
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AboutPage() {
  const [title, setTitle] = useState(fallbackAbout.title);
  const [intro, setIntro] = useState(fallbackAbout.intro);
  const [mission, setMission] = useState(fallbackAbout.mission);
  const [values, setValues] = useState<string[]>(
    splitValues(fallbackAbout.values),
  );

  useEffect(() => {
    let cancelled = false;

    const loadAboutContent = async () => {
      const items = await getSectionContentBlocks();

      if (cancelled) return;

      const aboutIntro = items.find(
        (item) => item.content_key === "about_intro",
      );

      const aboutValues = items.find(
        (item) => item.content_key === "about_values",
      );

      const aboutMission = items.find(
        (item) => item.content_key === "about_mission",
      );

      if (aboutIntro) {
        setTitle(aboutIntro.title || fallbackAbout.title);
        setIntro(
          aboutIntro.summary ||
            aboutIntro.body ||
            fallbackAbout.intro,
        );
      }

      if (aboutMission) {
        setMission(getContentText(aboutMission) || fallbackAbout.mission);
      }

      if (aboutValues) {
        const loadedValues = splitValues(getContentText(aboutValues));

        if (loadedValues.length > 0) {
          setValues(loadedValues);
        }
      }
    };

    void loadAboutContent();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicLayout>
      <section className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
            About Kivu Advisory
          </p>

          <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">
            {title}
          </h1>

          <p className="mt-6 max-w-3xl leading-relaxed text-white/75">
            {intro}
          </p>
        </div>
      </section>

      <section className="bg-softwhite py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
              Who We Are
            </p>

            <h2 className="mb-5 text-3xl font-bold text-navy sm:text-4xl">
              {title}
            </h2>

            <p className="mb-6 leading-relaxed text-gray-600">{intro}</p>

            <p className="leading-relaxed text-gray-600">{mission}</p>
          </div>

          <div className="rounded-2xl bg-lightgray p-6">
            <h3 className="mb-5 text-xl font-bold text-navy">
              What Clients Can Expect
            </h3>

            <div className="space-y-4">
              {values.map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle size={20} className="mt-0.5 shrink-0 text-teal" />
                  <p className="text-sm leading-relaxed text-gray-600">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/request-service"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
            >
              Request a Service
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-lightgray py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-teal">
              Our Focus
            </p>

            <h2 className="mb-4 text-3xl font-bold text-navy sm:text-4xl">
              Services Built Around Client Needs
            </h2>

            <p className="mx-auto max-w-2xl text-gray-600">
              Kivu Advisory combines professional service delivery with a clear
              digital workflow for requests, documents, assignments, and
              communication.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {focusAreas.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-gray-100 bg-softwhite p-6"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
                    <Icon size={20} className="text-teal" />
                  </div>

                  <h3 className="mb-2 text-base font-bold text-navy">
                    {item.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-gray-600">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}