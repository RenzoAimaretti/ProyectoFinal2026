import { ALMANAC_THEME_CSS } from "./tokens";
import { MotionBoot } from "./motion-boot";
import { Header } from "./header";
import { Hero } from "./hero";
import { Stats } from "./stats";
import { Distinctives } from "./distinctives";
import { NarrativeParte } from "./narrative-parte";
import { LotesMap } from "./lotes-map";
import { PhoneOffline } from "./phone-offline";
import { ModulesExplorer } from "./modules-explorer";
import { Roles } from "./roles";
import { Faq } from "./faq";
import { Cta } from "./cta";
import { Footer } from "./footer";
import { FloatingDemo } from "./floating-demo";

export function Landing() {
  return (
    <div className="almanac-world">
      <style
        id="alm-theme"
        dangerouslySetInnerHTML={{ __html: ALMANAC_THEME_CSS }}
      />
      <MotionBoot />
      <div className="alm-grain" aria-hidden="true" />

      <a href="#contenido" className="alm-skip">
        Saltar al contenido
      </a>

      <Header />

      <main id="contenido" tabIndex={-1}>
        <Hero />
        <Stats />
        <Distinctives />
        <NarrativeParte />
        <LotesMap />
        <PhoneOffline />
        <ModulesExplorer />
        <Roles />
        <Faq />
        <Cta />
      </main>

      <Footer />
      <FloatingDemo />
    </div>
  );
}
