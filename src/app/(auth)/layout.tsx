import { HeartHandshake, Sparkles } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { brand } from "@/config/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div className="story-content">
          <span className="story-badge">
            <Sparkles size={14} /> RITROVIAMOCI QUI
          </span>
          <h2>
            Meno rumore.
            <br />
            Più <em>persone.</em>
          </h2>
          <p>
            Un posto da chiamare tuo. Per raccontarti, ritrovare gli amici e
            fare nuove conoscenze.
          </p>
          <div className="story-note">
            <HeartHandshake size={25} />
            <span>
              Le connessioni belle
              <br />
              <strong>cominciano dalle persone.</strong>
            </span>
          </div>
        </div>
        <footer>{brand.name} · Il tuo spazio, al tuo ritmo.</footer>
      </aside>
      <main id="main" className="auth-main">
        {children}
      </main>
    </div>
  );
}
