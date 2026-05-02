"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import QRCode from "qrcode";

interface NetworkInfo {
  lanIps: { address: string; family: string; internal: boolean }[];
  localIps: { address: string; family: string; internal: boolean }[];
  port: number;
}

export default function QrUpload() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    fetch("/api/network-info")
      .then((res) => res.json())
      .then((data) => setNetworkInfo(data))
      .catch(() => {});
  }, []);

  // Extract travel ID from pathname
  const travelMatch = pathname.match(/^\/travels\/([^/]+)/);
  const travelId = travelMatch ? travelMatch[1] : null;

  const baseUrl = (() => {
    if (!networkInfo) return null;
    const ip =
      networkInfo.lanIps[0]?.address ||
      networkInfo.localIps.find((ip) => ip.address !== "127.0.0.1")?.address;
    if (!ip) return null;
    return `http://${ip}:${networkInfo.port}`;
  })();

  const targetUrl = baseUrl && travelId
    ? `${baseUrl}/upload/${travelId}`
    : baseUrl;

  // Generate QR code on canvas when modal opens
  useEffect(() => {
    if (showQr && targetUrl && canvasRef.current) {
      setQrError(false);
      QRCode.toCanvas(canvasRef.current, targetUrl, {
        width: 256,
        margin: 2,
        color: { dark: "#2d2d2d", light: "#ffffff" },
      }).catch(() => {
        setQrError(true);
      });
    }
  }, [showQr, targetUrl]);

  const qrModal = showQr && (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={() => setShowQr(false)}
    >
      <div
        className="bg-[var(--color-bg-card)] rounded-[var(--radius)] p-6 max-w-sm w-full space-y-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[var(--color-text)]">
            📱 手机扫码上传
            {travelId && (
              <span className="block text-xs font-normal text-[var(--color-text-muted)] mt-0.5">
                照片将上传到当前旅行
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowQr(false)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {targetUrl && !qrError ? (
          <>
            <div className="rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-border)] bg-white p-3 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full aspect-square max-w-[256px]"
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] text-center leading-relaxed">
              手机和电脑在同一个 WiFi
              <br />
              扫码即可用手机打开上传页面
              <br />
              {travelId
                ? "直接选照片上传到当前旅行"
                : "选择照片上传到相册"}
            </p>
            {travelId && (
              <p className="text-[10px] text-[var(--color-text-muted)] text-center break-all opacity-60">
                {targetUrl}
              </p>
            )}
          </>
        ) : !targetUrl ? (
          <div className="text-sm text-[var(--color-text-muted)] text-center py-8 space-y-2">
            {networkInfo ? (
              <>
                <p>未检测到可用 IP，请确认：</p>
                <ul className="text-xs space-y-1">
                  <li>1. 手机和电脑连接了同一个 WiFi</li>
                  <li>2. Windows 防火墙已放行 3000 端口</li>
                  <li>3. 用电脑开热点给手机连接</li>
                </ul>
              </>
            ) : (
              <p>正在检测网络...</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
            二维码生成失败，请重试
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setShowQr(true)}
        className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
      >
        <span className="text-lg">📱</span>
        <span>扫码上传</span>
      </button>

      {typeof window !== "undefined" &&
        createPortal(qrModal, document.body)}
    </>
  );
}
