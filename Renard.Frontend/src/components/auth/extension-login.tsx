import React, { useState } from "react";
import { ExtensionLayout } from "@/components/auth/extension-layout";
import { Loader2, Terminal, Globe } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

export default function ExtensionLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Detect source from URL (e.g. /extension-login?source=cli)
  const source = searchParams.get("source");
  const isCLI = source === "cli";

  const API_URL = import.meta.env.VITE_SERVER;

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { token, user } = response.data;

      // EXTENSION HANDSHAKE
      if (window.chrome?.runtime?.sendMessage) {
        try {
          window.chrome.runtime.sendMessage(
            import.meta.env.VITE_EXTENSION_ID,
            {
              type: "AUTH_SUCCESS",
              token,
              user,
            },
            () => {
              navigate("/extension-success");

              setTimeout(() => {
                window.close();
              }, 2000);
            }
          );
        } catch (e) {
          console.error("Failed to send token to extension", e);
        }
      } else {
        // Normal web login fallback
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Login failed", err);
      // specific error message from backend or fallback
      const errorMessage =
        err.response?.data?.message || "Invalid email or password.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ExtensionLayout
      title={isCLI ? "Authorize CLI" : "Connect Extension"}
      subtitle={
        isCLI
          ? "Log in to enable terminal context capturing."
          : "Sync your browser history with your Renard workspace."
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Visual Indicator of what we are connecting */}
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border mb-6">
          <div className="p-2 bg-background rounded-md border border-border">
            {isCLI ? (
              <Terminal className="w-4 h-4 text-foreground" />
            ) : (
              <Globe className="w-4 h-4 text-orange-500" />
            )}
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {isCLI ? "Renard CLI v1.2" : "Chrome Extension"}
            </p>
            <p className="text-xs text-muted-foreground">
              Requesting write access
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground text-foreground"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="password"
            >
              Password
            </label>
            <a href="#" className="text-xs text-primary hover:underline">
              Forgot?
            </a>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground text-foreground"
            required
          />
        </div>

        <button
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Authorize Access
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">New to Renard? </span>
        <a
          href={`/extension-signup?source=${source || "extension"}`}
          className="text-primary font-medium hover:underline"
        >
          Create account
        </a>
      </div>
    </ExtensionLayout>
  );
}
