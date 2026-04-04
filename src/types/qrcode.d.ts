declare module "qrcode" {
  type QRCodeOptions = {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  };

  function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
  };

  export { toDataURL };
  export default QRCode;
}
