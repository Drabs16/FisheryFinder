import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { PANEL_URL } from '../lib/constants';
import { pageWrap } from './MyCatches';

const CONTACT_EMAIL = 'kontakt@fisheryfinder.pl';

/* ---------- układ treści (proza) ---------- */
function Doc({ title, lead, updated, children }: { title: string; lead?: string; updated?: string; children: ReactNode }) {
  return (
    <div style={pageWrap}>
      <div className="info-doc">
        <Link to="/" className="info-back"><Icon name="chevronLeft" size={15} /> Wróć do łowisk</Link>
        <h1>{title}</h1>
        {lead && <p className="info-lead">{lead}</p>}
        {updated && <div className="info-updated">Ostatnia aktualizacja: {updated}</div>}
        <div className="prose">{children}</div>
      </div>
    </div>
  );
}

function S({ h, children }: { h: string; children: ReactNode }) {
  return <section><h2>{h}</h2>{children}</section>;
}

/* ============================ O NAS ============================ */
export function About() {
  return (
    <div style={pageWrap}>
      <div className="info-doc wide">
        <Link to="/" className="info-back"><Icon name="chevronLeft" size={15} /> Wróć do łowisk</Link>
        <span className="info-eyebrow">O Fishery Finder</span>
        <h1>Wszystkie łowiska w Polsce w jednym miejscu — partnerskie rezerwujesz online.</h1>
        <p className="info-lead">
          Fishery Finder to katalog komercyjnych łowisk w całym kraju połączony z systemem rezerwacji.
          Przeglądasz i porównujesz łowiska, a w obiektach partnerskich sprawdzasz realną dostępność
          stanowisk na wybrany termin i rezerwujesz miejsce online — bez telefonów i niepewności.
        </p>

        <div className="info-steps">
          <Step icon="list" n="1" title="Znajdź łowisko" desc="Filtruj po rodzaju, rybach, cenie i odległości. Mapa pokazuje obiekty w okolicy z ceną od." />
          <Step icon="calendar" n="2" title="Sprawdź dostępność" desc="W łowiskach partnerskich widzisz, ile stanowisk jest wolnych na dany dzień, dobę lub nockę." />
          <Step icon="check" n="3" title="Zarezerwuj online" desc="Wybierasz stanowiska i termin, a właściciel potwierdza rezerwację. Płatność na miejscu lub online." />
        </div>

        <div className="info-cards">
          <InfoCard icon="trophy" title="Dziennik i rywalizacja" desc="Zapisuj swoje połowy, twórz tablice rywalizacji z kolegami i porównujcie wagę, liczbę i big fisha." />
          <InfoCard icon="heart" title="Ulubione i historia" desc="Zapisuj łowiska na później, miej rezerwacje i połowy w jednym koncie — wspólnym ze stroną i aplikacją mobilną." />
          <InfoCard icon="star" title="Realne opinie" desc="Oceny i opinie wystawiają wędkarze po wizycie. Łowiska partnerskie dbają o aktualne dane i dostępność." />
        </div>

        <div className="info-partner">
          <div>
            <div className="info-partner-badge"><Icon name="fish" size={15} color="var(--ff-primary)" /> Łowisko partnerskie</div>
            <h3>Masz łowisko? Przyjmuj rezerwacje online.</h3>
            <p>W panelu właściciela zarządzasz cennikiem, kalendarzem stanowisk, rezerwacjami, bazą klientów,
              opiniami i analityką. Wędkarze trafiają do Ciebie z całej Polski.</p>
          </div>
          <a className="info-partner-btn" href={`${PANEL_URL}`} target="_blank" rel="noreferrer">
            Panel właściciela <Icon name="arrowRight" size={16} />
          </a>
        </div>

        <div className="info-prose-end prose">
          <S h="Jak zarabiamy">
            <p>Wpis katalogowy łowiska jest bezpłatny. Łowiska partnerskie korzystają z płatnej subskrypcji
              (rezerwacje online, kalendarz, CRM), a od rezerwacji opłaconych online pobieramy niewielką
              prowizję serwisową. Dla wędkarza korzystanie z Fishery Finder jest darmowe.</p>
          </S>
          <S h="Kontakt">
            <p>Pytania, współpraca, zgłoszenia: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              Więcej w zakładce <Link to="/kontakt">Kontakt</Link>.</p>
          </S>
        </div>
      </div>
    </div>
  );
}

function Step({ icon, n, title, desc }: { icon: IconName; n: string; title: string; desc: string }) {
  return (
    <div className="info-step">
      <div className="info-step-ico"><Icon name={icon} size={20} color="var(--ff-primary)" /><span>{n}</span></div>
      <div className="info-step-t">{title}</div>
      <div className="info-step-d">{desc}</div>
    </div>
  );
}
function InfoCard({ icon, title, desc }: { icon: IconName; title: string; desc: string }) {
  return (
    <div className="info-card">
      <div className="info-card-ico"><Icon name={icon} size={20} color="var(--ff-primary)" /></div>
      <div className="info-card-t">{title}</div>
      <div className="info-card-d">{desc}</div>
    </div>
  );
}

/* ============================ KONTAKT ============================ */
export function Contact() {
  return (
    <Doc title="Kontakt" lead="Najszybciej odpowiadamy mailowo. Piszą do nas zarówno wędkarze, jak i właściciele łowisk.">
      <div className="info-contact">
        <ContactRow icon="mail" label="E-mail" value={CONTACT_EMAIL} href={`mailto:${CONTACT_EMAIL}`} />
        <ContactRow icon="globe" label="Strona" value="fisheryfinder.pl" href="https://fisheryfinder.pl" />
        <ContactRow icon="fish" label="Dla właścicieli" value="Panel właściciela łowiska" href={PANEL_URL} />
      </div>
      <S h="Wędkarze">
        <p>Pytania o rezerwacje, konto, połowy lub opinie — napisz na <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          Rezerwacjami konkretnego pobytu zarządza właściciel łowiska — dane kontaktowe znajdziesz na stronie łowiska.</p>
      </S>
      <S h="Właściciele łowisk">
        <p>Chcesz przyjmować rezerwacje online i zarządzać łowiskiem? Załóż konto w
          <a href={`${PANEL_URL}/register`} target="_blank" rel="noreferrer"> panelu właściciela</a> lub napisz do nas —
          pomożemy z konfiguracją i przejęciem wpisu Twojego łowiska.</p>
      </S>
      <S h="Reklamacje">
        <p>Zgłoszenia dotyczące działania serwisu rozpatrujemy w terminie do 14 dni. Szczegóły w
          <Link to="/regulamin"> Regulaminie</Link>.</p>
      </S>
    </Doc>
  );
}
function ContactRow({ icon, label, value, href }: { icon: IconName; label: string; value: string; href: string }) {
  return (
    <a className="info-contact-row" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
      <div className="info-contact-ico"><Icon name={icon} size={20} color="var(--ff-primary)" /></div>
      <div><div className="info-contact-l">{label}</div><div className="info-contact-v">{value}</div></div>
      <Icon name="chevronRight" size={18} color="var(--ff-text-tertiary)" />
    </a>
  );
}

/* ============================ REGULAMIN ============================ */
export function Terms() {
  return (
    <Doc title="Regulamin serwisu Fishery Finder" updated="czerwiec 2026"
      lead="Zasady korzystania z serwisu i aplikacji Fishery Finder przez wędkarzy.">
      <S h="1. Postanowienia ogólne">
        <p>Regulamin określa zasady korzystania z serwisu internetowego fisheryfinder.pl oraz aplikacji mobilnej
          Fishery Finder („Serwis"), prowadzonych przez operatora Fishery Finder („Operator"). Serwis umożliwia
          wyszukiwanie łowisk komercyjnych w Polsce oraz rezerwację stanowisk w łowiskach partnerskich.</p>
      </S>
      <S h="2. Definicje">
        <p><b>Wędkarz</b> — użytkownik korzystający z Serwisu w celu wyszukiwania łowisk i rezerwacji stanowisk.
          <b> Łowisko</b> — obiekt prezentowany w katalogu. <b>Łowisko partnerskie</b> — łowisko z aktywną
          subskrypcją, które przyjmuje rezerwacje online. <b>Właściciel</b> — podmiot zarządzający łowiskiem.</p>
      </S>
      <S h="3. Konto">
        <p>Założenie konta wymaga podania imienia i nazwiska, adresu e-mail, numeru telefonu oraz miejscowości.
          Konto jest wspólne dla strony i aplikacji mobilnej. Wędkarz odpowiada za prawdziwość podanych danych
          i zachowanie poufności hasła. Korzystanie z katalogu i przeglądanie łowisk nie wymaga konta;
          rezerwacja, dodawanie połowów, ulubione i opinie — wymagają konta.</p>
      </S>
      <S h="4. Rezerwacje">
        <p>Rezerwacja stanowiska w łowisku partnerskim jest składana za pośrednictwem Serwisu i wymaga
          potwierdzenia przez Właściciela. Do czasu potwierdzenia rezerwacja ma status oczekującej i nie
          wiąże się z pobraniem opłaty online. Umowa dotycząca pobytu zawierana jest pomiędzy Wędkarzem
          a Właścicielem łowiska — Operator pełni rolę pośrednika technicznego.</p>
      </S>
      <S h="5. Płatności">
        <p>Płatność za pobyt następuje na miejscu lub online, zgodnie z opcjami danego łowiska. Przy płatności
          online doliczana jest opłata serwisowa wskazana w podsumowaniu rezerwacji. Aktualnie płatności online
          działają w trybie testowym — szczegóły zostaną doprecyzowane po uruchomieniu operatora płatności.</p>
      </S>
      <S h="6. Anulowanie">
        <p>Wędkarz może anulować rezerwację w panelu „Moje rezerwacje". Warunki rezygnacji (w tym ewentualne
          zwroty) zależą od zasad danego łowiska. Właściciel może odrzucić rezerwację oczekującą; informacja
          o decyzji pojawia się w Serwisie i — jeśli włączone — w wiadomości e-mail.</p>
      </S>
      <S h="7. Treści użytkownika">
        <p>Dodając połowy, zdjęcia i opinie, Wędkarz oświadcza, że ma do nich prawa i że nie naruszają one
          prawa ani dóbr osób trzecich. Opinie powinny być rzetelne i dotyczyć rzeczywistej wizyty. Operator
          może moderować treści naruszające Regulamin lub przepisy.</p>
      </S>
      <S h="8. Odpowiedzialność">
        <p>Operator dokłada starań o aktualność danych i ciągłość działania Serwisu, lecz nie odpowiada za
          informacje wprowadzane przez Właścicieli ani za przebieg pobytu na łowisku. Operator nie odpowiada
          za przerwy wynikające z przyczyn technicznych lub siły wyższej.</p>
      </S>
      <S h="9. Reklamacje i kontakt">
        <p>Reklamacje można zgłaszać na adres <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Operator
          rozpatruje zgłoszenia w terminie do 14 dni.</p>
      </S>
      <S h="10. Zmiany Regulaminu">
        <p>Operator może zmienić Regulamin z ważnych przyczyn (zmiana przepisów, zakresu usług, względy
          bezpieczeństwa), informując o tym w Serwisie. Dalsze korzystanie po wejściu zmian w życie oznacza
          ich akceptację.</p>
      </S>
    </Doc>
  );
}

/* ======================== POLITYKA PRYWATNOŚCI ======================== */
export function Privacy() {
  return (
    <Doc title="Polityka prywatności" updated="czerwiec 2026"
      lead="Jak przetwarzamy dane osobowe wędkarzy korzystających z Fishery Finder.">
      <S h="1. Administrator danych">
        <p>Administratorem danych osobowych jest Operator serwisu Fishery Finder. Kontakt w sprawach danych:
          <a href={`mailto:${CONTACT_EMAIL}`}> {CONTACT_EMAIL}</a>.</p>
      </S>
      <S h="2. Zakres i cele">
        <p>Przetwarzamy dane konta (imię i nazwisko, e-mail, telefon, miejscowość) w celu prowadzenia konta,
          obsługi rezerwacji i kontaktu. Dane rezerwacji (termin, stanowiska, imię i telefon) udostępniamy
          Właścicielowi łowiska wyłącznie w celu realizacji rezerwacji. Połowy, ulubione i opinie przetwarzamy
          w celu działania odpowiednich funkcji.</p>
      </S>
      <S h="3. Podstawa prawna">
        <p>Przetwarzanie odbywa się na podstawie umowy o świadczenie usług (art. 6 ust. 1 lit. b RODO),
          obowiązków prawnych (lit. c) oraz prawnie uzasadnionego interesu (lit. f — bezpieczeństwo i analityka
          zagregowana). Opinie publikujemy na podstawie Twojej aktywności w Serwisie.</p>
      </S>
      <S h="4. Odbiorcy danych">
        <p>Dane rezerwacji trafiają do Właściciela wybranego łowiska. Dane mogą być powierzane dostawcom
          infrastruktury (hosting, baza danych, e-mail transakcyjny) wyłącznie w zakresie niezbędnym do
          świadczenia usługi. Nie sprzedajemy danych osobowych.</p>
      </S>
      <S h="5. Okres przechowywania">
        <p>Dane konta przechowujemy przez czas korzystania z Serwisu i okres przedawnienia roszczeń. Po usunięciu
          konta dane usuwamy lub anonimizujemy, z wyjątkiem informacji, które musimy zachować z przyczyn prawnych.</p>
      </S>
      <S h="6. Twoje prawa">
        <p>Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia
          oraz sprzeciwu, a także prawo wniesienia skargi do Prezesa UODO. Żądania realizujemy na adres
          <a href={`mailto:${CONTACT_EMAIL}`}> {CONTACT_EMAIL}</a>.</p>
      </S>
      <S h="7. Pliki cookies">
        <p>Serwis używa niezbędnych plików cookies (m.in. sesja logowania) oraz pamięci przeglądarki do zapisania
          ustawień i ulubionych. Nie stosujemy cookies marketingowych bez Twojej zgody.</p>
      </S>
    </Doc>
  );
}
