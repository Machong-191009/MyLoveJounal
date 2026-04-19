import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, inviteCode, togetherSince } = body;

    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "用户名、邮箱和密码为必填项" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: existingUser.email === email ? "邮箱已被注册" : "用户名已被使用" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    // If inviteCode is provided, join existing couple
    if (inviteCode) {
      const couple = await prisma.couple.findUnique({
        where: { inviteCode },
        include: { users: true },
      });

      if (!couple) {
        return NextResponse.json(
          { error: "邀请码无效" },
          { status: 400 }
        );
      }

      if (couple.users.length >= 2) {
        return NextResponse.json(
          { error: "该邀请码已被使用，一段关系只能有两个人哦" },
          { status: 400 }
        );
      }

      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          coupleId: couple.id,
        },
      });

      return NextResponse.json({
        message: "注册成功！你们已成功配对",
        user: { id: user.id, username: user.username, email: user.email },
        coupleId: couple.id,
        paired: true,
      });
    }

    // No inviteCode — create new couple
    if (!togetherSince) {
      return NextResponse.json(
        { error: "请填写你们在一起的日期" },
        { status: 400 }
      );
    }

    const newInviteCode = generateInviteCode();

    const couple = await prisma.couple.create({
      data: {
        inviteCode: newInviteCode,
        togetherSince: new Date(togetherSince),
      },
    });

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        coupleId: couple.id,
      },
    });

    return NextResponse.json({
      message: "注册成功！请将邀请码发给你的另一半",
      user: { id: user.id, username: user.username, email: user.email },
      coupleId: couple.id,
      inviteCode: newInviteCode,
      paired: false,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后再试" },
      { status: 500 }
    );
  }
}
