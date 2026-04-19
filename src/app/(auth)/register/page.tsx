"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Card from "@/components/ui/Card";

type Mode = "create" | "join";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [togetherSince, setTogetherSince] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("密码至少需要6个字符");
      setLoading(false);
      return;
    }

    try {
      const body: Record<string, string> = { username, email, password };
      if (mode === "join") {
        body.inviteCode = inviteCode;
      } else {
        body.togetherSince = togetherSince;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (data.inviteCode) {
        setGeneratedCode(data.inviteCode);
        setSuccess(data.message);
      } else {
        setSuccess(data.message);
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setError("注册失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">💑</div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          创建账号
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          开始记录你们的爱情故事
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-[var(--radius)] bg-[var(--color-bg-soft)] p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            mode === "create"
              ? "bg-white text-[var(--color-primary)] shadow-[var(--shadow-sm)]"
              : "text-[var(--color-text-secondary)]"
          }`}
        >
          创建新情侣空间
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            mode === "join"
              ? "bg-white text-[var(--color-primary)] shadow-[var(--shadow-sm)]"
              : "text-[var(--color-text-secondary)]"
          }`}
        >
          使用邀请码加入
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="username"
          label="昵称"
          placeholder="你的昵称"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <Input
          id="email"
          label="邮箱"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="password"
          label="密码"
          type="password"
          placeholder="至少6个字符"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          id="confirmPassword"
          label="确认密码"
          type="password"
          placeholder="再次输入密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {mode === "create" && (
          <Input
            id="togetherSince"
            label="在一起的日期"
            type="date"
            value={togetherSince}
            onChange={(e) => setTogetherSince(e.target.value)}
            required
          />
        )}

        {mode === "join" && (
          <Input
            id="inviteCode"
            label="邀请码"
            placeholder="输入对方给你的邀请码"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
          />
        )}

        {error && (
          <p className="text-sm text-[var(--color-danger)] text-center">
            {error}
          </p>
        )}

        {success && (
          <div className="text-sm text-[var(--color-success)] text-center space-y-2">
            <p>{success}</p>
            {generatedCode && (
              <div className="bg-[var(--color-bg-soft)] rounded-[var(--radius-sm)] p-4">
                <p className="text-[var(--color-text-secondary)] mb-1">你的邀请码：</p>
                <p className="text-2xl font-bold tracking-widest text-[var(--color-primary)]">
                  {generatedCode}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                  请将此邀请码发给你的另一半
                </p>
              </div>
            )}
          </div>
        )}

        {!generatedCode && (
          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={loading}
          >
            {mode === "create" ? "注册并创建空间" : "注册并加入"}
          </Button>
        )}

        {generatedCode && (
          <Button
            type="button"
            className="w-full"
            size="lg"
            onClick={() => router.push("/login")}
          >
            前往登录
          </Button>
        )}
      </form>

      <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
        已有账号？{" "}
        <Link
          href="/login"
          className="text-[var(--color-primary)] hover:underline font-medium"
        >
          登录
        </Link>
      </div>
    </Card>
  );
}
