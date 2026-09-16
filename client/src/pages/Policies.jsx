import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { STORE_NAME } from '../api';
import { useConfig } from '../context/ConfigContext';

// Starter policy text - review it (or ask a professional) before going live
export default function Policies() {
  const { hash } = useLocation();
  const config = useConfig();

  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <div className="policies">
      <h1>Policies</h1>
      <nav className="chips">
        <a className="chip" href="#terms">Terms</a>
        <a className="chip" href="#privacy">Privacy</a>
        <a className="chip" href="#refund">Refunds</a>
        <a className="chip" href="#contact">Contact</a>
      </nav>

      <section id="terms" className="card pad">
        <h2>Terms & conditions</h2>
        <p>{STORE_NAME} sells digital machine embroidery design files. When you buy a design you get a licence to use it for your own embroidery work and for products you make and sell.</p>
        <ul>
          <li>You may not resell, share, upload or give away the design files, in original or edited form.</li>
          <li>Check the file format, stitch count and size against your machine before buying.</li>
          <li>Download packages are for one account only and expire after their validity period. Unused downloads do not carry over.</li>
          <li>Colours in preview images may look different from the stitched result.</li>
          <li>We may block accounts that misuse downloads or share files.</li>
        </ul>
      </section>

      <section id="privacy" className="card pad">
        <h2>Privacy policy</h2>
        <p>We collect your name, email, phone number and order details to deliver your designs and support you. Payments are handled by our payment partner; we do not store card or bank details. We do not sell your personal data. You can ask us to delete your account at any time.</p>
      </section>

      <section id="refund" className="card pad">
        <h2>Refund policy</h2>
        <p>Design files are digital and delivered instantly, so orders cannot be returned. We give a refund or a replacement design if:</p>
        <ul>
          <li>you paid but could not download the files, or</li>
          <li>the file is damaged and does not open on a supported machine.</li>
        </ul>
        <p>Write to us within 7 days of purchase with your order number. Approved refunds go back to the original payment method within 5–7 working days.</p>
      </section>

      <section id="contact" className="card pad">
        <h2>Contact us</h2>
        <p>Questions about an order, a file or custom digitising? We're happy to help.</p>
        <ul>
          {config.supportEmail && <li>Email: <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a></li>}
          {config.supportPhone && <li>Phone: <a href={`tel:${config.supportPhone}`}>{config.supportPhone}</a></li>}
          {config.whatsapp && <li>WhatsApp: <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer">Chat with us</a></li>}
          {!config.supportEmail && !config.supportPhone && !config.whatsapp && <li className="muted">Contact details coming soon.</li>}
        </ul>
      </section>
    </div>
  );
}
