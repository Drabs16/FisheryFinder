import { Link } from 'react-router-dom';
import { PANEL_URL } from '../lib/constants';
import Icon from './Icon';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="brand2">
            <img src="/logo-fish.png" alt="" />
            <span><span className="g">FISHERY </span><span className="w">FINDER</span></span>
          </div>
          <p className="ftag">Znajdź i zarezerwuj najlepsze łowiska komercyjne w Polsce — online, w kilka chwil, z realną dostępnością stanowisk.</p>
          <a className="footer-cta" href={PANEL_URL} target="_blank" rel="noreferrer">Masz łowisko? Panel właściciela <Icon name="arrowRight" size={15} /></a>
        </div>
        <div className="fcol">
          <h4>Odkrywaj</h4>
          <Link to="/">Łowiska</Link>
          <Link to="/mapa">Mapa</Link>
          <Link to="/rezerwacje">Rezerwacje</Link>
        </div>
        <div className="fcol">
          <h4>Konto</h4>
          <Link to="/login">Zaloguj się</Link>
          <Link to="/rejestracja">Załóż konto</Link>
          <Link to="/profil">Profil</Link>
        </div>
        <div className="fcol">
          <h4>Fishery Finder</h4>
          <Link to="/o-nas">O nas</Link>
          <Link to="/kontakt">Kontakt</Link>
          <Link to="/regulamin">Regulamin</Link>
          <Link to="/polityka-prywatnosci">Polityka prywatności</Link>
          <a href={`mailto:kontakt@fisheryfinder.pl?subject=${encodeURIComponent('Zgłoszenie naruszenia')}`}>Zgłoś naruszenie</a>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="inner">
          <span>© {year} Fishery Finder. Wszelkie prawa zastrzeżone.</span>
          <span>Tworzone w Polsce — dla wędkarzy</span>
        </div>
      </div>
    </footer>
  );
}
