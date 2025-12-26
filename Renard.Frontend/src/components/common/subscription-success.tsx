import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, X, Zap, ArrowRight, Copy } from "lucide-react";
import * as confetti from "canvas-confetti";

export function SubscriptionSuccess() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Extract params
  const success = searchParams.get("success");
  const subscriptionId = searchParams.get("subscription_id");
  const status = searchParams.get("status");

  useEffect(() => {
    if (success === "true") {
      setIsOpen(true);

      // Trigger Confetti (If you installed canvas-confetti)
      // If not installed, you can remove this block, the UI still looks great.
      try {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = {
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 60,
        };

        const randomInRange = (min: number, max: number) =>
          Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          });
        }, 250);
      } catch (e) {
        // Fallback or ignore if lib not present
      }
    }
  }, [success]);

  const handleClose = () => {
    setIsOpen(false);
    // Remove query params from URL without refreshing the page
    // This ensures the modal doesn't show up again on refresh
    navigate("/dashboard", { replace: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-300">
        {/* Top Decoration */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500"></div>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          {/* Animated Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
            <div className="relative bg-green-100 dark:bg-green-900/30 rounded-full w-20 h-20 flex items-center justify-center border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            Payment Successful!
          </h2>
          <p className="text-muted-foreground mb-6">
            Welcome to the{" "}
            <span className="text-primary font-bold">Pro Plan</span>. Your
            account has been instantly upgraded.
          </p>

          {/* Transaction Details */}
          <div className="bg-secondary/50 rounded-xl p-4 mb-6 border border-border/50 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/20 px-2 py-0.5 rounded-full text-xs uppercase tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {status || "Active"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subscription ID</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background border border-border px-1.5 py-0.5 rounded font-mono text-foreground max-w-[100px] truncate">
                  {subscriptionId || "sub_123..."}
                </code>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="flex items-center gap-1 text-foreground font-medium">
                <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                Renard Pro
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 group"
          >
            Start Exploring
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
