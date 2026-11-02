import { APP_BACKGROUND_COLOR, DARK_TEXT_COLOR } from "@/lib/constants/domain";

import { StudioAppIcon } from "./studio-app-icon";

type StudioSplashProps = {
  name: string;
  primaryColor: string;
  logoDataUrl: string | null;
  width: number;
  height: number;
};

/**
 * Schermata di avvio dell'app installata (ImageResponse, solo stili inline):
 * logo dello studio al centro e il suo nome sotto, sullo sfondo dell'app.
 */
export function StudioSplash({
  name,
  primaryColor,
  logoDataUrl,
  width,
  height,
}: StudioSplashProps) {
  const short = Math.min(width, height);
  const logo = Math.round(short * 0.3);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(short * 0.06),
        background: APP_BACKGROUND_COLOR,
        color: DARK_TEXT_COLOR,
      }}
    >
      <div
        style={{
          width: logo,
          height: logo,
          display: "flex",
          borderRadius: Math.round(logo * 0.22),
          overflow: "hidden",
        }}
      >
        <StudioAppIcon
          name={name}
          primaryColor={primaryColor}
          logoDataUrl={logoDataUrl}
          size={logo}
          padding={0.1}
        />
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: Math.round(width * 0.8),
          textAlign: "center",
          fontSize: Math.round(short * 0.065),
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        {name}
      </div>
    </div>
  );
}
