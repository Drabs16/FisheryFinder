import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

// Wspólny układ stron prawnych (Regulamin / Polityka prywatności).
function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="legal-page">
      <div className="legal-bar">
        <Link to="/" className="legal-logo">
          <img src="/logo-fish.png" alt="" width={26} height={26} />
          <span>FISHERY <b>FINDER</b> · Biznes</span>
        </Link>
        <Link to="/" className="btn ghost sm"><Icon name="chevronLeft" size={15} /> Powrót</Link>
      </div>
      <div className="legal-body">
        <h1>{title}</h1>
        <div className="legal-updated">Ostatnia aktualizacja: {updated}</div>
        {children}
        <div className="legal-foot">
          © {new Date().getFullYear()} Fishery Finder · <a href="https://fisheryfinder.pl" target="_blank" rel="noreferrer">fisheryfinder.pl</a>
        </div>
      </div>
    </div>
  );
}

function S({ h, children }: { h: string; children: ReactNode }) {
  return <section className="legal-sec"><h2>{h}</h2>{children}</section>;
}

export function Terms() {
  return (
    <LegalLayout title="Regulamin panelu Fishery Finder Biznes" updated="czerwiec 2026">
      <S h="1. Postanowienia ogólne">
        <p>Niniejszy Regulamin określa zasady korzystania z panelu właściciela łowiska („Panel") dostępnego pod adresem biznes.fisheryfinder.pl, prowadzonego przez operatora serwisu Fishery Finder („Operator"). Korzystając z Panelu, Właściciel akceptuje postanowienia Regulaminu.</p>
      </S>
      <S h="2. Definicje">
        <p><b>Właściciel</b> — przedsiębiorca lub osoba zarządzająca łowiskiem, korzystająca z Panelu. <b>Wędkarz</b> — użytkownik aplikacji konsumenckiej rezerwujący stanowiska. <b>Łowisko</b> — obiekt prezentowany w katalogu Fishery Finder. <b>Subskrypcja</b> — odpłatny plan (Premium / Pro) odblokowujący funkcje rezerwacji i CRM.</p>
      </S>
      <S h="3. Konto i weryfikacja">
        <p>Założenie konta wymaga podania prawdziwych danych (imię i nazwisko / nazwa firmy, e-mail, telefon, opcjonalnie NIP i adres). Zarządzanie łowiskiem wymaga przejęcia istniejącego wpisu katalogowego (kodem od Operatora lub poprzez wniosek o dostęp zatwierdzany przez Operatora). Operator może odmówić lub cofnąć dostęp w razie nieprawidłowości.</p>
      </S>
      <S h="4. Zakres usługi">
        <p>Panel umożliwia m.in.: edycję danych łowiska, zarządzanie cennikiem, sezonem i zasadami rezerwacji, przyjmowanie i potwierdzanie rezerwacji online (plan Premium/Pro), prowadzenie bazy klientów oraz dostęp do analityki i raportów (plan Pro). Zakres funkcji zależy od wybranego planu.</p>
      </S>
      <S h="5. Plany i płatności">
        <p>Plan Basic jest bezpłatny (wpis katalogowy). Plany Premium i Pro są płatne w cyklu miesięcznym lub rocznym, zgodnie z cennikiem w zakładce „Subskrypcja". Subskrypcja odnawia się automatycznie do czasu rezygnacji. Rezygnacja powoduje powrót do planu Basic po zakończeniu opłaconego okresu. Aktualnie płatności działają w trybie testowym — szczegóły rozliczeń zostaną doprecyzowane przy uruchomieniu realnego operatora płatności.</p>
      </S>
      <S h="6. Obowiązki Właściciela">
        <p>Właściciel zobowiązuje się do podawania rzetelnych informacji o łowisku i cenniku, terminowego potwierdzania lub odrzucania rezerwacji oraz honorowania potwierdzonych rezerwacji. Treści (zdjęcia, opisy) nie mogą naruszać prawa ani praw osób trzecich.</p>
      </S>
      <S h="7. Odpowiedzialność">
        <p>Operator udostępnia narzędzie pośredniczące i nie jest stroną umowy między Właścicielem a Wędkarzem. Operator dokłada starań o ciągłość działania Panelu, lecz nie odpowiada za przerwy wynikające z przyczyn technicznych lub siły wyższej.</p>
      </S>
      <S h="8. Reklamacje i kontakt">
        <p>Reklamacje dotyczące działania Panelu można zgłaszać na adres kontakt@fisheryfinder.pl. Operator rozpatruje zgłoszenia w terminie do 14 dni.</p>
      </S>
      <S h="9. Zmiany Regulaminu">
        <p>Operator może zmienić Regulamin z ważnych przyczyn (zmiana przepisów, zakresu usług, względy bezpieczeństwa). O zmianach Właściciel zostanie poinformowany w Panelu. Dalsze korzystanie po wejściu zmian w życie oznacza ich akceptację.</p>
      </S>
    </LegalLayout>
  );
}

export function Privacy() {
  return (
    <LegalLayout title="Polityka prywatności" updated="czerwiec 2026">
      <S h="1. Administrator danych">
        <p>Administratorem danych osobowych przetwarzanych w związku z Panelem jest Operator serwisu Fishery Finder. Kontakt w sprawach danych: kontakt@fisheryfinder.pl.</p>
      </S>
      <S h="2. Zakres i cele przetwarzania">
        <p>Przetwarzamy dane konta Właściciela (imię i nazwisko / nazwa firmy, e-mail, telefon, NIP, adres) w celu świadczenia usługi, rozliczeń i kontaktu. Dane rezerwacji i klientów (imię, telefon) przetwarzane są w celu realizacji rezerwacji oraz prowadzenia bazy klientów łowiska.</p>
      </S>
      <S h="3. Podstawa prawna">
        <p>Przetwarzanie odbywa się na podstawie umowy (art. 6 ust. 1 lit. b RODO), obowiązków prawnych (lit. c — np. rozliczenia) oraz prawnie uzasadnionego interesu (lit. f — bezpieczeństwo, analityka zagregowana).</p>
      </S>
      <S h="4. Odbiorcy i powierzenie">
        <p>Dane mogą być powierzane dostawcom infrastruktury (hosting, baza danych, e-mail transakcyjny) wyłącznie w zakresie niezbędnym do świadczenia usługi, na podstawie umów powierzenia. Nie sprzedajemy danych osobowych.</p>
      </S>
      <S h="5. Okres przechowywania">
        <p>Dane konta przechowujemy przez czas trwania umowy i okres przedawnienia roszczeń. Dane rozliczeniowe — przez okres wymagany przepisami podatkowymi.</p>
      </S>
      <S h="6. Prawa osób">
        <p>Przysługuje prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia, przenoszenia oraz sprzeciwu, a także prawo wniesienia skargi do Prezesa UODO. Żądania realizujemy na adres kontakt@fisheryfinder.pl.</p>
      </S>
      <S h="7. Pliki cookies">
        <p>Panel używa niezbędnych plików cookies (m.in. sesja logowania). Nie stosujemy w Panelu cookies marketingowych bez zgody.</p>
      </S>
    </LegalLayout>
  );
}
