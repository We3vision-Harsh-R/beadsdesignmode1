import { useConfig } from '../context/ConfigContext';

export default function Policies() {
  const config = useConfig();

  return (
    <div className="policies">
      <h1>Contact us</h1>
      <section id="contact" className="card pad">
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
