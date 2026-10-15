import { pickForeground } from "@/lib/color";
import { LIGHT_TEXT_COLOR } from "@/lib/constants/domain";
import { initialsOf } from "@/lib/studio/branding";

type StudioAppIconProps = {
  name: string;
  primaryColor: string;
  /** Logo come data URL; senza logo si disegnano le iniziali sul colore principale. */
  logoDataUrl: string | null;
  size: number;
  /** Margine interno in proporzione al lato (le icone "maskable" ne vogliono di più). */
  padding: number;
};

/**
 * Icona dell'app per ImageResponse (manifest, apple-touch-icon).
 * Solo stili inline: è disegnata da Satori, non dal browser.
 */
export function StudioAppIcon({
  name,
  primaryColor,
  logoDataUrl,
  size,
  padding,
}: StudioAppIconProps) {
  const inner = Math.round(size * (1 - padding * 2));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: logoDataUrl ? LIGHT_TEXT_COLOR : primaryColor,
        color: pickForeground(primaryColor).color,
        fontSize: Math.round(inner * 0.45),
        fontWeight: 700,
      }}
    >
      {logoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Satori richiede <img>
        <img
          src={logoDataUrl}
          width={inner}
          height={inner}
          alt=""
          style={{ objectFit: "contain" }}
        />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}
