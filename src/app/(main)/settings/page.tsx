"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface CoupleInfo {
  id: string;
  inviteCode: string;
  togetherSince: string;
}

interface PartnerInfo {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}

export default function SettingsPage() {
  // ---- state ----
  const [user, setUser] = useState<UserInfo | null>(null);
  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 基本信息
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [togetherSince, setTogetherSince] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  // 头像
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ type: "", text: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  // 密码
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });

  // ---- fetch ----
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setCouple(data.couple);
        setPartner(data.partner);
        setUsername(data.user.username);
        setEmail(data.user.email);
        if (data.couple) {
          setTogetherSince(data.couple.togetherSince.split("T")[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ---- handlers ----

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: "", text: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, togetherSince }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ type: "success", text: "个人信息已更新" });
        fetchSettings();
      } else {
        setProfileMsg({ type: "error", text: data.error });
      }
    } catch {
      setProfileMsg({ type: "error", text: "更新失败" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!fileRef.current?.files?.[0]) return;
    setSavingAvatar(true);
    setAvatarMsg({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("files", fileRef.current.files[0]);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        setAvatarMsg({ type: "error", text: "上传失败" });
        return;
      }

      const uploadData = await uploadRes.json();
      const avatarUrl = uploadData.media[0]?.fileUrl;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });

      if (res.ok) {
        setAvatarMsg({ type: "success", text: "头像已更新" });
        fetchSettings();
      } else {
        const data = await res.json();
        setAvatarMsg({ type: "error", text: data.error });
      }
    } catch {
      setAvatarMsg({ type: "error", text: "上传失败" });
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "两次输入的新密码不一致" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: "success", text: "密码已修改" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMsg({ type: "error", text: data.error });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "修改失败" });
    } finally {
      setSavingPassword(false);
    }
  };

  // ---- render ----

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl animate-heartbeat">💝</div>
        <p className="text-[var(--color-text-muted)] mt-2">加载中...</p>
      </div>
    );
  }

  const currentAvatar = avatarPreview || user?.avatarUrl;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          管理你的个人信息
        </p>
      </div>

      {/* ===== 头像 ===== */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">头像</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {currentAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentAvatar}
                alt="avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-border)]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[var(--color-bg-soft)] border-2 border-[var(--color-border)] flex items-center justify-center text-3xl">
                {user?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                选择图片
              </Button>
              {avatarPreview && (
                <Button
                  size="sm"
                  loading={savingAvatar}
                  onClick={handleUploadAvatar}
                >
                  保存头像
                </Button>
              )}
            </div>
            <Msg msg={avatarMsg} />
          </div>
        </div>
      </Card>

      {/* ===== 基本信息 ===== */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">基本信息</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            id="username"
            label="昵称"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            id="email"
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {couple && (
            <Input
              id="togetherSince"
              label="在一起的日期"
              type="date"
              value={togetherSince}
              onChange={(e) => setTogetherSince(e.target.value)}
            />
          )}
          <Msg msg={profileMsg} />
          <Button type="submit" loading={savingProfile}>
            保存修改
          </Button>
        </form>
      </Card>

      {/* ===== 修改密码 ===== */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">修改密码</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="currentPassword"
            label="当前密码"
            type="password"
            placeholder="输入当前密码"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            id="newPassword"
            label="新密码"
            type="password"
            placeholder="至少6个字符"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            id="confirmPassword"
            label="确认新密码"
            type="password"
            placeholder="再次输入新密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Msg msg={passwordMsg} />
          <Button type="submit" loading={savingPassword}>
            修改密码
          </Button>
        </form>
      </Card>

      {/* ===== 情侣信息 ===== */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">情侣空间</h2>
        {couple ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-secondary)]">邀请码</span>
              <span className="font-mono font-bold tracking-widest text-[var(--color-primary)]">
                {couple.inviteCode}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-secondary)]">另一半</span>
              <span>{partner ? partner.username : "等待加入..."}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[var(--color-text-secondary)]">在一起的日期</span>
              <span>
                {new Date(couple.togetherSince).toLocaleDateString("zh-CN")}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[var(--color-text-muted)]">尚未配对</p>
        )}
      </Card>

      {/* ===== 退出登录 ===== */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">账号操作</h2>
        <Button
          variant="danger"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          退出登录
        </Button>
      </Card>
    </div>
  );
}

/** 小型提示组件 */
function Msg({ msg }: { msg: { type: string; text: string } }) {
  if (!msg.text) return null;
  return (
    <p
      className={`text-sm ${
        msg.type === "success"
          ? "text-[var(--color-success)]"
          : "text-[var(--color-danger)]"
      }`}
    >
      {msg.text}
    </p>
  );
}
