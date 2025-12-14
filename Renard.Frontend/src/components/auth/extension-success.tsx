import { CheckCircle } from "lucide-react";

export default function ExtensionSuccess() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
      <h1 className="text-xl font-semibold">Connected to Renard</h1>
      <p className="text-sm text-muted-foreground mt-2">
        You can close this tab safely
      </p>
    </div>
  );
}
