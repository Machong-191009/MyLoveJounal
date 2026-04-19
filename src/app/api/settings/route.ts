import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { hash, compare } from "bcryptjs";

// GET /api/settings - 获取当前用户信息
export async function GET() {
  try {
    const user = await requireUser();

    const partner = user.coupleId
      ? await prisma.user.findFirst({
          where: { coupleId: user.coupleId, id: { not: user.id } },
          select: { id: true, username: true, avatarUrl: true, email: true },
        })
      : null;

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      couple: user.couple
        ? {
            id: user.couple.id,
            inviteCode: user.couple.inviteCode,
            togetherSince: user.couple.togetherSince,
          }
        : null,
      partner,
    });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "获取信息失败" }, { status: 500 });
  }
}

// PUT /api/settings - 更新个人信息
export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { username, email, avatarUrl, currentPassword, newPassword, togetherSince } = body;

    // ---- 修改密码 ----
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "请输入当前密码" }, { status: 400 });
      }
      const valid = await compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "新密码至少需要6个字符" }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hash(newPassword, 12) },
      });
    }

    // ---- 修改用户名 / 邮箱 / 头像 ----
    const updateData: Record<string, string> = {};

    if (username && username !== user.username) {
      const exists = await prisma.user.findFirst({
        where: { username, id: { not: user.id } },
      });
      if (exists) {
        return NextResponse.json({ error: "用户名已被使用" }, { status: 400 });
      }
      updateData.username = username;
    }

    if (email && email !== user.email) {
      const exists = await prisma.user.findFirst({
        where: { email, id: { not: user.id } },
      });
      if (exists) {
        return NextResponse.json({ error: "邮箱已被注册" }, { status: 400 });
      }
      updateData.email = email;
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // ---- 修改在一起的日期 ----
    if (togetherSince && user.coupleId) {
      await prisma.couple.update({
        where: { id: user.coupleId },
        data: { togetherSince: new Date(togetherSince) },
      });
    }

    return NextResponse.json({ message: "更新成功" });
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
