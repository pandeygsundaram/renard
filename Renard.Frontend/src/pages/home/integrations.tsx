import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Globe,
  Terminal,
  Chrome,
  Download,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

export default function IntegrationsPage() {
  const integrations = [
    {
      name: "Chrome Extension",
      description:
        "Track your browser activity, research, and documentation reading in real-time.",
      icon: Chrome,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      status: "available",
      links: [
        {
          label: "Install from Chrome Web Store",
          url: "#chrome-store",
          type: "install",
        },
        {
          label: "View Documentation",
          url: "#docs",
          type: "docs",
        },
      ],
    },
    {
      name: "Firefox Extension",
      description:
        "Track your browser activity, research, and documentation reading in real-time on Firefox.",
      icon: Globe,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      status: "available",
      links: [
        {
          label: "Install from Firefox Add-ons",
          url: "#firefox-addons",
          type: "install",
        },
        {
          label: "View Documentation",
          url: "#docs",
          type: "docs",
        },
      ],
    },
    {
      name: "CLI Tool",
      description:
        "Sync your terminal commands, git commits, and development workflow automatically.",
      icon: Terminal,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      status: "installed",
      links: [
        {
          label: "View Installation Guide",
          url: "#cli-guide",
          type: "docs",
        },
      ],
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        </div>
        <p className="text-muted-foreground">
          Connect Renard with your favorite tools to automatically track your work
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <div
              key={integration.name}
              className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors"
            >
              {/* Icon and Status */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${integration.bgColor} rounded-lg`}>
                  <Icon className={`w-6 h-6 ${integration.color}`} />
                </div>
                {integration.status === "installed" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500 font-medium">
                      Installed
                    </span>
                  </div>
                )}
              </div>

              {/* Title and Description */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {integration.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {integration.description}
              </p>

              {/* Links */}
              <div className="space-y-2">
                {integration.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      link.type === "install"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions Section */}
      <div className="mt-8 bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Getting Started
        </h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              1
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Install the CLI Tool
              </h4>
              <p className="text-sm text-muted-foreground">
                Run{" "}
                <code className="px-2 py-1 bg-secondary rounded text-foreground">
                  npm install -g @renard/cli
                </code>{" "}
                to install the Renard CLI globally.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              2
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Add Browser Extension
              </h4>
              <p className="text-sm text-muted-foreground">
                Install the Chrome or Firefox extension to track your browser
                activity and research.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              3
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Start Tracking
              </h4>
              <p className="text-sm text-muted-foreground">
                Your activities will be automatically synced and searchable in the
                Knowledge Brain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
