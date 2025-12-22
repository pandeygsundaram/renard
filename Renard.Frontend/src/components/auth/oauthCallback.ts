import axios from "axios";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const completeLogin = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
          throw new Error("No token found in URL");
        }

        localStorage.setItem("token", token);

        const response = await axios.get(
          `${import.meta.env.VITE_SERVER}/auth/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const { user, apiKey, team } = response.data;

        localStorage.setItem("user", JSON.stringify(user));

        if (apiKey) {
          localStorage.setItem("apiKey", apiKey);
        }

        if (team) {
          localStorage.setItem("team", JSON.stringify(team));
        }

        navigate("/dashboard");
      } catch (error) {
        console.error("OAuth Callback Error:", error);
        localStorage.removeItem("token");
        navigate("/login?error=auth_failed");
      }
    };

    completeLogin();
  }, [navigate]);
  return null;
}
