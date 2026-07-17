import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* pb généreux < lg : dégage le contenu de la barre de navigation fixe mobile */}
      <div className="container mx-auto px-4 pt-8 pb-24 lg:py-12">
        <div className="mb-6 grid grid-cols-2 gap-6 md:mb-8 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src="/belivay-logo.png"
                alt="BelivaY"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="w-10 h-10 bg-white/10 hover:bg-primary rounded-lg flex items-center justify-center transition-all">
                <Facebook size={18} />
              </a>
              <a href="#" aria-label="Instagram" className="w-10 h-10 bg-white/10 hover:bg-primary rounded-lg flex items-center justify-center transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" aria-label="Twitter" className="w-10 h-10 bg-white/10 hover:bg-primary rounded-lg flex items-center justify-center transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" aria-label="YouTube" className="w-10 h-10 bg-white/10 hover:bg-primary rounded-lg flex items-center justify-center transition-all">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-base mb-3 md:text-lg md:mb-4">{t('footer.quick_links')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/catalog" className="text-gray-300 hover:text-primary transition-colors text-sm">
                  {t('footer.catalog')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-primary transition-colors text-sm">
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-gray-300 hover:text-primary transition-colors text-sm">
                  {t('footer.how_it_works')}
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="text-gray-300 hover:text-primary transition-colors text-sm">
                  Mes favoris
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-display font-semibold text-base mb-3 md:text-lg md:mb-4">{t('footer.support')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-gray-300 hover:text-primary transition-colors text-sm">
                  {t('footer.help')}
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="text-gray-300 hover:text-primary transition-colors text-sm">
                  {t('footer.shipping')}
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-gray-300 hover:text-primary transition-colors text-sm">
                  {t('footer.returns')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-primary transition-colors text-sm">
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-display font-semibold text-base mb-3 md:text-lg md:mb-4">{t('footer.contact_us')}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">
                  Yaoundé, Cameroun
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Phone size={18} className="text-primary flex-shrink-0" />
                <a href="tel:+237" className="text-gray-300 hover:text-primary transition-colors">
                  +237 XXX XXX XXX
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Mail size={18} className="text-primary flex-shrink-0" />
                <a href="mailto:contact@belivay.com" className="text-gray-300 hover:text-primary transition-colors">
                  contact@belivay.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-white/10 md:pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              © {currentYear} Belivay. {t('footer.rights')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm md:justify-start">
              <Link to="/privacy" className="text-gray-400 hover:text-primary transition-colors">
                {t('footer.privacy')}
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-primary transition-colors">
                {t('footer.terms')}
              </Link>
              <Link to="/legal" className="text-gray-400 hover:text-primary transition-colors">
                {t('footer.legal')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}