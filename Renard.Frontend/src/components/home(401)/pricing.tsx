import { CheckCircle2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CommonLayout } from "../layout/common-layout";
import { BlogLayout } from "../layout/blogs-layout";
import { TestLayout } from "../layout/test-layout";

export const Pricing = () => {
  const nav = useNavigate();
  return (
    <section className="py-24 bg-secondary/30" id="pricing">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Simple, Scalable Pricing
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
          Start for free. Upgrade to Pro for your core team, then scale easily
          with add-ons as you grow.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Starter (Free) */}
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:border-primary/30 transition-colors text-left flex flex-col">
            <h3 className="text-lg font-semibold text-foreground">Starter</h3>
            <div className="mt-4 flex items-baseline">
              <span className="text-4xl font-bold tracking-tight text-foreground">
                $0
              </span>
              <span className="text-muted-foreground ml-1">/mo</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Perfect for solo hackers.
            </p>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground mb-8">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground font-medium">
                  1 Team Limit
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground font-medium">
                  1 Member (You)
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />7 days
                retention
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                Basic Summaries
              </li>
            </ul>
            <div className="mt-auto">
              <button
                className="w-full bg-secondary text-secondary-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                onClick={() => {
                  nav("/signup");
                }}
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Pro Team (The Core Offering) */}
          <div className="bg-primary p-8 rounded-2xl border border-primary shadow-xl text-left relative overflow-hidden group flex flex-col transform md:-translate-y-4">
            <div className="absolute top-0 right-0 bg-white/10 w-24 h-24 blur-2xl rounded-full -mr-6 -mt-6"></div>

            <h3 className="text-lg font-semibold text-primary-foreground">
              Renard Pro
            </h3>
            <div className="mt-4 flex items-baseline">
              <span className="text-4xl font-bold tracking-tight text-primary-foreground">
                $20
              </span>
              <span className="text-primary-foreground/90 ml-1">/mo</span>
            </div>
            <p className="mt-2 text-sm text-primary-foreground/90 font-medium">
              Includes 1 Team + 3 Members
            </p>

            <div className="my-6 border-t border-primary-foreground/20"></div>

            <ul className="space-y-4 text-sm text-primary-foreground/90 mb-8">
              <li className="flex gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                Everything in Starter
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                Unlimited Retention
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                Full Vector Search
              </li>

              {/* Add-ons Section */}
              <li className="pt-2 pb-1 text-xs font-semibold uppercase tracking-wider opacity-80">
                Available Add-ons:
              </li>
              <li className="flex gap-2 items-center">
                <Plus className="w-3 h-3 text-white shrink-0" />
                <span>
                  Extra Seat: <span className="font-bold">$5</span> /mo
                </span>
              </li>
              <li className="flex gap-2 items-center">
                <Plus className="w-3 h-3 text-white shrink-0" />
                <span>
                  Extra Team: <span className="font-bold">$10</span> /mo
                </span>
              </li>
            </ul>

            <div className="mt-auto">
              <button
                onClick={() => nav("/signup")}
                className="w-full bg-white text-primary py-3 rounded-lg font-bold hover:bg-gray-50 shadow-lg transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>

          {/* Enterprise */}
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:border-primary/30 transition-colors text-left flex flex-col">
            <h3 className="text-lg font-semibold text-foreground">
              Enterprise
            </h3>
            <div className="mt-4 flex items-baseline">
              <span className="text-4xl font-bold tracking-tight text-foreground">
                Custom
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              For large organizations needing unlimited scale.
            </p>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground mb-8">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                Unlimited Teams & Seats
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                On-premise deployment
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                Custom SSO (Okta, SAML)
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                Dedicated Support Manager
              </li>
            </ul>
            <div className="mt-auto">
              <button className="w-full bg-secondary text-secondary-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors">
                Lets Talk
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
