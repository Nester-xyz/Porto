import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CgDanger } from "react-icons/cg";
import { BsFillInfoCircleFill } from "react-icons/bs";
import { HiEye, HiEyeSlash } from "react-icons/hi2";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  onLogin: (userName: string, password: string) => void;
  error: string;
  isLoading: boolean;
  showTwoFactor: boolean;
  verificationCode: string;
  onVerificationCodeChange: (code: string) => void;
}

const LoginForm = ({
  onLogin,
  error,
  isLoading,
  showTwoFactor,
  verificationCode,
  onVerificationCodeChange,
}: LoginFormProps) => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showToolTip, setShowToolTip] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    console.log("twoFactorNeeded", showTwoFactor);
    if (userName === "" || password === "") {
      alert("Please fill in both the username and password.");
    } else {
      onLogin(userName, password);
    }
  };

  const appPasswordRoute = () => {
    window.open(
      "https://github.com/bluesky-social/atproto-ecosystem/blob/main/app-passwords.md",
      "_blank"
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-6 shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-center text-4xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {/* Error */}
            <div>
              {error && (
                <div
                  id="error"
                  className={`mt-1 text-sm border rounded-md p-2 flex gap-2 ${
                    showTwoFactor
                      ? "bg-yellow-100 border-yellow-400 text-yellow-600 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-100"
                      : "bg-red-100 border-red-400 text-red-600 dark:bg-red-900 dark:border-red-700 dark:text-red-100"
                  }`}
                >
                  <CgDanger className="flex-shrink-0 mt-1" />
                  <span>{error}</span>
                </div>
              )}
            </div>
            {/* Username Input */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="userName">Username</Label>
              <Input
                id="userName"
                type="text"
                placeholder="johndoe.bsky.social"
                className="mt-1"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1 relative">
              {showToolTip && (
                <div className="bg-muted border border-border p-3 rounded-md text-sm absolute -translate-y-1/2 -top-1/2">
                  Temporary password for third party applications!
                </div>
              )}
              <div className="flex items-center gap-1">
                <Label htmlFor="password">App Password</Label>
                <div
                  className="text-sm cursor-pointer flex items-center"
                  onMouseEnter={() => setShowToolTip(true)}
                  onClick={appPasswordRoute}
                  onMouseLeave={() => setShowToolTip(false)}
                >
                  <BsFillInfoCircleFill />
                </div>
              </div>
              <div className="mt-1 flex items-center border rounded-md px-3 ">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="border-none focus-visible:ring-0 p-0"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div
                  className="ml-2 cursor-pointer"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <HiEyeSlash size={20} />
                  ) : (
                    <HiEye size={20} />
                  )}
                </div>
              </div>
            </div>

            {showTwoFactor && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="twoFactorCode">Verification Code</Label>
                <div className="flex items-center border rounded-md px-3">
                  <Input
                    id="twoFactorCode"
                    type="text"
                    placeholder="Enter the 2FA code from your email"
                    className="border-none focus-visible:ring-0 p-0"
                    value={verificationCode}
                    onChange={(e) => onVerificationCodeChange(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Login Button */}
            <Button
              className="w-full mt-4"
              type="submit"
              disabled={!userName || !password || isLoading} // Disables button if fields are empty
            >
              Login
            </Button>

            <button type="submit" disabled={isLoading}></button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
