declare module "heic-convert" {
  type HeicConvertOptions = {
    buffer: Buffer | Uint8Array | ArrayBuffer;
    format: "JPEG" | "PNG";
    quality?: number;
    all?: boolean;
  };

  export default function heicConvert(options: HeicConvertOptions): Promise<Buffer | Uint8Array | ArrayBuffer>;
}
