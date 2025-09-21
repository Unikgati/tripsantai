import React, { useState } from 'react';
import { useWishlist } from '../contexts/WishlistContext';
import { Page, AppSettings } from '../types';
import { SunIcon, MoonIcon, HeartIcon, MenuIcon, XIcon } from './Icons';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  setPage: (page: Page) => void;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ setPage, appSettings, setAppSettings, isAuthenticated = false }) => {
  const { wishlist } = useWishlist();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const handleNavClick = (page: Page, to: string) => {
      // Keep legacy state in sync if setPage exists
      try { setPage && setPage(page); } catch (e) {}
      navigate(to);
      setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleTheme = () => {
    setAppSettings(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  };
  
  const logoUrl = appSettings.theme === 'dark'
    ? appSettings.logoDarkUrl || appSettings.logoLightUrl
    : appSettings.logoLightUrl || appSettings.logoDarkUrl;
    
  const navItems: { page: Page; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'destinations', label: 'Destinasi' },
    { page: 'blog', label: 'Blog' },
    // Admin link should only be shown for authenticated users
    ...(isAuthenticated ? [{ page: 'admin' as Page, label: 'Admin' }] : []),
  ];

  return (
    <>
      <header className="header">
        <div className="container header-nav">
          <Link to="/" className="logo" onClick={() => handleNavClick('home', '/') }>
            {logoUrl ? <img src={logoUrl} alt={`${appSettings.brandName} Logo`} /> : appSettings.brandName}
          </Link>
          <nav>
              <ul className="nav-links">
              {navItems.map(item => (
                <li key={item.page}><Link to={item.page === 'home' ? '/' : `/${item.page}`} onClick={() => handleNavClick(item.page, item.page === 'home' ? '/' : `/${item.page}`)}>{item.label}</Link></li>
              ))}
            </ul>
          </nav>
          <div className="header-actions">
             <button className="wishlist-indicator" onClick={() => { try { setPage && setPage('wishlist'); } catch {} ; navigate('/wishlist'); }} aria-label={`Wishlist, ${wishlist.length} items`}>
                <HeartIcon />
                {wishlist.length > 0 && <span className="wishlist-count">{wishlist.length}</span>}
              </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={appSettings.theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {appSettings.theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
             <button className="hamburger" aria-label="Open menu" onClick={toggleMobileMenu}>
                <MenuIcon />
              </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-nav-overlay ${isMobileMenuOpen ? 'visible' : ''}`} onClick={toggleMobileMenu}></div>
      <nav className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`} aria-hidden={!isMobileMenuOpen}>
        <div className="mobile-nav-header">
      <Link to="/" className="logo" onClick={() => handleNavClick('home', '/') }>
        {logoUrl ? <img src={logoUrl} alt={`${appSettings.brandName} Logo`} /> : appSettings.brandName}
      </Link>
            <button className="mobile-nav-close" onClick={toggleMobileMenu} aria-label="Close menu">
                <XIcon />
            </button>
        </div>
        <ul className="mobile-nav-links">
            {navItems.map(item => (
              <li key={item.page}><Link to={item.page === 'home' ? '/' : `/${item.page}`} onClick={() => handleNavClick(item.page, item.page === 'home' ? '/' : `/${item.page}`)}>{item.label}</Link></li>
            ))}
        </ul>
      </nav>
    </>
  );
};