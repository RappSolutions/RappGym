import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import { AVATAR_OUTPUT_PX, clampOffset, cropRect, cropScale } from "@/lib/avatar-crop";

const VIEW = 256;

/** 1:1 cropper: drag to pan, slider/wheel to zoom; exports a 256 px JPEG. */
export function AvatarCropDialog({
  file,
  onCancel,
  onDone,
}: {
  file: File | null;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const { t } = useLanguage();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setImg(null);
    setZoom(1);
    setOff({ x: 0, y: 0 });
    if (!file) return;
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const w = img?.naturalWidth ?? 1;
  const h = img?.naturalHeight ?? 1;
  const s = cropScale(w, h, VIEW, zoom);
  const c = clampOffset(w, h, VIEW, zoom, off.x, off.y);
  const setZ = (z: number) => setZoom(Math.min(4, Math.max(1, z)));

  function save() {
    if (!img) return;
    const r = cropRect(w, h, VIEW, zoom, off.x, off.y);
    const cv = document.createElement("canvas");
    cv.width = cv.height = AVATAR_OUTPUT_PX;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, r.sx, r.sy, r.size, r.size, 0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX);
    cv.toBlob((b) => b && onDone(b), "image/jpeg", 0.88);
  }

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("avatar.cropTitle")}</DialogTitle>
        </DialogHeader>
        <div
          data-testid="avatar-crop-area"
          className="relative mx-auto touch-none overflow-hidden rounded-md bg-muted select-none"
          style={{ width: VIEW, height: VIEW, cursor: "grab" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { px: e.clientX, py: e.clientY, x: c.x, y: c.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            setOff(clampOffset(w, h, VIEW, zoom, d.x + e.clientX - d.px, d.y + e.clientY - d.py));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => setZ(zoom - e.deltaY / 500)}
        >
          {img && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: w * s,
                height: h * s,
                left: VIEW / 2 - (w * s) / 2 + c.x,
                top: VIEW / 2 - (h * s) / 2 + c.y,
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(0_0_0/0.45)]" />
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          {t("avatar.zoom")}
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZ(Number(e.target.value))}
          />
        </label>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t("avatar.cancel")}
          </Button>
          <Button variant="outline" disabled={!img} onClick={save}>
            {t("avatar.cropSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
