import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Data Access Layer: verify session and get current user with couple info.
 * Wrapped with React.cache() so multiple calls in one request only query once.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      couple: true,
    },
  });

  return user;
});

/**
 * Get current user or throw -- use in routes that require auth.
 */
export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
});

/**
 * Get current couple or throw -- use in routes that require a paired couple.
 */
export const requireCouple = cache(async () => {
  const user = await requireUser();
  if (!user.coupleId || !user.couple) {
    throw new Error("Not paired yet");
  }
  return { user, couple: user.couple };
});
