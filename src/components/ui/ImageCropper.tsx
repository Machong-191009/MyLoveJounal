"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import Button from "@/components/ui/Button";

interface ImageCropperProps {
  /** 要裁剪的图片 URL (base64 或 blob URL) */
  imageSrc: string;
  /** 裁剪宽高比，不传则自由裁剪 */
  aspect?: number;
  /** 确认裁剪回调，返回裁剪后的 File */
  onCropDone: (croppedFile: File) => void;
  /** 取消回调 */
  onCancel: () => void;
  /** 输出文件名 */
  fileName?: string;
}

/** 预设比例选项 */
const aspectOptions = [
  { label: "自由", value: 0 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
  { label: "3:4", value: 3 / 4 },
  { label: "9:16", value: 9 / 16 },
];

/**
 * 根据裁剪区域从原图中裁剪出一张新图片，返回 File 对象
 * 使用原图的自然尺寸进行裁剪以保证质量
 */
async function getCroppedFile(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  fileName: string
): Promise<File> {
  const canvas = document.createElement("canvas");

  // 计算缩放比例：裁剪坐标是基于显示尺寸的，需要映射到自然尺寸
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.floor(pixelCrop.width * scaleX);
  canvas.height = Math.floor(pixelCrop.height * scaleY);

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  });
}

/**
 * 创建一个居中的初始裁剪区域
 */
function createInitialCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  if (aspect > 0) {
    // 有比例约束时，先创建一个合适比例的裁剪框，再居中
    return centerCrop(
      makeAspectCrop(
        { unit: "%", width: 80 },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }

  // 自由裁剪：默认选中 80% 的区域，居中
  return centerCrop(
    { unit: "%", x: 0, y: 0, width: 80, height: 80 },
    mediaWidth,
    mediaHeight
  );
}

export default function ImageCropper({
  imageSrc,
  aspect: initialAspect,
  onCropDone,
  onCancel,
  fileName = "cropped.jpg",
}: ImageCropperProps) {
  const [aspect, setAspect] = useState(initialAspect ?? 0);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  /** 图片加载完毕后设置初始裁剪区域 */
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      imgRef.current = e.currentTarget;
      const initialCrop = createInitialCrop(width, height, aspect);
      setCrop(initialCrop);
    },
    [aspect]
  );

  /** 切换比例时重新计算裁剪区域 */
  const handleAspectChange = useCallback(
    (newAspect: number) => {
      setAspect(newAspect);
      if (imgRef.current) {
        const { width, height } = imgRef.current;
        const newCrop = createInitialCrop(width, height, newAspect);
        setCrop(newCrop);
        setCompletedCrop(null);
      }
    },
    []
  );

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    // 确保裁剪区域有实际大小
    if (completedCrop.width <= 0 || completedCrop.height <= 0) return;

    setProcessing(true);
    try {
      const file = await getCroppedFile(
        imgRef.current,
        completedCrop,
        fileName
      );
      onCropDone(file);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* 裁剪区域 */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect > 0 ? aspect : undefined}
          keepSelection
          ruleOfThirds
          className="max-h-full"
        >
          <img
            src={imageSrc}
            alt="裁剪预览"
            onLoad={onImageLoad}
            style={{ maxHeight: "calc(100vh - 160px)", maxWidth: "100%" }}
            crossOrigin="anonymous"
          />
        </ReactCrop>
      </div>

      {/* 控制栏 */}
      <div className="bg-[var(--color-bg)] border-t border-[var(--color-border)] p-4 space-y-3">
        {/* 比例选择器 */}
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <span className="text-xs text-[var(--color-text-muted)] mr-1">
            比例:
          </span>
          {aspectOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleAspectChange(opt.value)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                aspect === opt.value
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm} loading={processing}>
            确认裁剪
          </Button>
        </div>
      </div>
    </div>
  );
}
