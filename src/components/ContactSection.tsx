import { useState, type FormEvent } from 'react';
import { Instagram, Mail, MapPin, MessageCircle, Phone, Send, Youtube } from 'lucide-react';
import type { ContactInfo } from '../types/store';

interface ContactSectionProps {
  contact: ContactInfo;
  onOpenAdmin: () => void;
}

export function ContactSection({ contact, onOpenAdmin }: ContactSectionProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [inquiryType, setInquiryType] = useState('Retail Order Inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanPhone = contact.mobile.replace(/[^0-9+]/g, '');
  const telHref = cleanPhone.startsWith('+') ? `tel:${cleanPhone}` : `tel:+91${cleanPhone}`;
  const cleanWa = contact.whatsapp.replace(/[^0-9]/g, '');
  const waHref = `https://wa.me/${cleanWa.length === 10 ? `91${cleanWa}` : cleanWa}`;
  const hasEmail = Boolean(contact.email?.trim());
  const rawIg = contact.instagram?.trim() || '';
  const hasInstagram = Boolean(rawIg);
  const igHref = rawIg
    ? rawIg.startsWith('http://') || rawIg.startsWith('https://')
      ? rawIg
      : `https://instagram.com/${rawIg.replace(/^@/, '')}`
    : '';
  const rawYt = contact.youtube?.trim() || '';
  const hasYoutube = Boolean(rawYt);
  const ytHref = rawYt
    ? rawYt.startsWith('http://') || rawYt.startsWith('https://')
      ? rawYt
      : `https://youtube.com/${rawYt.startsWith('@') ? rawYt : `@${rawYt}`}`
    : '';

  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${contact.mapLat},${contact.mapLng}`,
  )}&z=${contact.mapZoom || 11}&output=embed`;
  const mapDirectionsUrl = `https://www.google.com/maps/search/?api=1&query=${contact.mapLat},${contact.mapLng}`;

  const handleInquiry = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSentMessage(null);
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, inquiryType, subject, message }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Could not send inquiry.');
      } else {
        setSentMessage('Your inquiry has been received by JSMW.');
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
      }
    } catch {
      setErrorMsg('Network error while sending inquiry.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="contact"
      className="border-t border-[#3B2313]/12 bg-[#160F09] py-16 text-[#FAF6EE] lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left: Official Contact Details & Map */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#F2B705]">
                Contact & Export Inquiries
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#FFF8EC]">
                {contact.company}
              </h2>
              <p className="mt-2 text-sm text-[#EADBC2]/80">
                Direct orders, wholesale enquiries, and international delivery assistance from Dindigul, Tamil Nadu, India.
              </p>
            </div>

            <dl className="space-y-4 border-t border-[#D98A1C]/20 pt-6 text-sm">
              <div>
                <dt className="text-xs text-[#EADBC2]/60">Location</dt>
                <dd className="mt-0.5 font-medium text-[#FFF8EC]">{contact.location}</dd>
              </div>

              <div>
                <dt className="text-xs text-[#EADBC2]/60">Full Address</dt>
                <dd className="mt-0.5 text-[#EADBC2]/90">
                  {contact.fullAddress || 'Address pending — configure in Admin Dashboard'}
                </dd>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#EADBC2]/60">Mobile</dt>
                  <dd className="mt-0.5 font-mono-tabular text-base font-medium text-[#F2B705]">
                    {contact.mobile}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#EADBC2]/60">WhatsApp</dt>
                  <dd className="mt-0.5 font-mono-tabular text-base font-medium text-[#F2B705]">
                    {contact.whatsapp}
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#EADBC2]/60">Business Email</dt>
                  <dd className="mt-0.5">
                    {hasEmail ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="font-medium text-[#F2B705] hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-xs text-[#EADBC2]/70">
                        Not set yet —{' '}
                        <button
                          type="button"
                          onClick={onOpenAdmin}
                          className="underline text-[#F2B705] hover:text-white"
                        >
                          configure in Admin
                        </button>
                      </span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-[#EADBC2]/60">Social Channels (Instagram & YouTube)</dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                    {hasInstagram ? (
                      <a
                        href={igHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#F2B705] hover:underline"
                      >
                        <Instagram className="h-3.5 w-3.5" />
                        Instagram
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenAdmin}
                        className="underline text-[#EADBC2]/70 hover:text-[#F2B705]"
                      >
                        Add Instagram in Admin
                      </button>
                    )}
                    <span className="text-[#EADBC2]/30">·</span>
                    {hasYoutube ? (
                      <a
                        href={ytHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#F2B705] hover:underline"
                      >
                        <Youtube className="h-3.5 w-3.5" />
                        YouTube
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenAdmin}
                        className="underline text-[#EADBC2]/70 hover:text-[#F2B705]"
                      >
                        Add YouTube in Admin
                      </button>
                    )}
                  </dd>
                </div>
              </div>
            </dl>

            {/* Clickable Action Buttons: Call Now, WhatsApp, Mail, Instagram, YouTube */}
            <div className="flex flex-wrap gap-2.5">
              <a
                href={telHref}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E59A1A] px-4 py-2.5 text-xs font-semibold text-[#180F07] hover:bg-[#F2B705] transition-colors whitespace-nowrap"
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#F2B705]/40 bg-[#23170E] px-4 py-2.5 text-xs font-semibold text-[#FAF6EE] hover:border-[#F2B705] transition-colors whitespace-nowrap"
              >
                <MessageCircle className="h-4 w-4 text-[#F2B705]" />
                WhatsApp
              </a>
              {hasEmail ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#F2B705]/40 bg-[#23170E] px-4 py-2.5 text-xs font-semibold text-[#FAF6EE] hover:border-[#F2B705] transition-colors whitespace-nowrap"
                >
                  <Mail className="h-4 w-4 text-[#F2B705]" />
                  Mail
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#F2B705]/25 bg-[#23170E]/60 px-4 py-2.5 text-xs font-medium text-[#EADBC2]/85 hover:border-[#F2B705] whitespace-nowrap"
                >
                  <Mail className="h-4 w-4 text-[#F2B705]" />
                  Mail
                </button>
              )}
              {hasInstagram ? (
                <a
                  href={igHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#F2B705]/40 bg-[#23170E] px-4 py-2.5 text-xs font-semibold text-[#FAF6EE] hover:border-[#F2B705] transition-colors whitespace-nowrap"
                >
                  <Instagram className="h-4 w-4 text-[#F2B705]" />
                  Instagram
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#F2B705]/25 bg-[#23170E]/60 px-4 py-2.5 text-xs font-medium text-[#EADBC2]/85 hover:border-[#F2B705] whitespace-nowrap"
                >
                  <Instagram className="h-4 w-4 text-[#F2B705]" />
                  Instagram
                </button>
              )}
              {hasYoutube ? (
                <a
                  href={ytHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#F2B705]/40 bg-[#23170E] px-4 py-2.5 text-xs font-semibold text-[#FAF6EE] hover:border-[#F2B705] transition-colors whitespace-nowrap"
                >
                  <Youtube className="h-4 w-4 text-[#F2B705]" />
                  YouTube
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#F2B705]/25 bg-[#23170E]/60 px-4 py-2.5 text-xs font-medium text-[#EADBC2]/85 hover:border-[#F2B705] whitespace-nowrap"
                >
                  <Youtube className="h-4 w-4 text-[#F2B705]" />
                  YouTube
                </button>
              )}
            </div>

            {/* Editable Location Map */}
            <div className="overflow-hidden rounded-xl border border-[#D98A1C]/25 bg-[#1F150D]">
              <div className="flex items-center justify-between border-b border-[#D98A1C]/15 px-4 py-2.5 text-xs">
                <span className="inline-flex items-center gap-1.5 text-[#EADBC2]/90">
                  <MapPin className="h-3.5 w-3.5 text-[#F2B705]" />
                  {contact.mapLabel}
                </span>
                <a
                  href={mapDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#F2B705] hover:underline whitespace-nowrap"
                >
                  Open Google Maps
                </a>
              </div>
              <iframe
                title="JSMW Dindigul Location Map"
                src={mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-56 w-full border-0"
              />
            </div>
          </div>

          {/* Right: Business Inquiry Form */}
          <div className="lg:col-span-6">
            <form
              onSubmit={handleInquiry}
              className="rounded-2xl border border-[#D98A1C]/20 bg-[#20160E] p-6 sm:p-8 space-y-4"
            >
              <h3 className="font-display text-2xl font-semibold text-[#FFF8EC]">
                Business & Order Inquiry
              </h3>
              <p className="text-xs text-[#EADBC2]/75">
                Reach out for retail assistance, bulk wholesale supply, or international export enquiries.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#EADBC2]/90">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1 w-full rounded-lg border border-[#D98A1C]/25 bg-[#140D08] px-3 py-2.5 text-sm text-[#FFF8EC] placeholder:text-[#EADBC2]/40 focus:border-[#F2B705] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#EADBC2]/90">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 ..."
                    className="mt-1 w-full rounded-lg border border-[#D98A1C]/25 bg-[#140D08] px-3 py-2.5 text-sm text-[#FFF8EC] placeholder:text-[#EADBC2]/40 focus:border-[#F2B705] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#EADBC2]/90">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-lg border border-[#D98A1C]/25 bg-[#140D08] px-3 py-2.5 text-sm text-[#FFF8EC] placeholder:text-[#EADBC2]/40 focus:border-[#F2B705] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#EADBC2]/90">
                    Inquiry Type
                  </label>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#D98A1C]/25 bg-[#140D08] px-3 py-2.5 text-sm text-[#FFF8EC] focus:border-[#F2B705] focus:outline-none"
                  >
                    <option>Retail Order Inquiry</option>
                    <option>Bulk / Wholesale Supply</option>
                    <option>International Export</option>
                    <option>Corporate Gifting</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#EADBC2]/90">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="How can we help?"
                  className="mt-1 w-full rounded-lg border border-[#D98A1C]/25 bg-[#140D08] px-3 py-2.5 text-sm text-[#FFF8EC] placeholder:text-[#EADBC2]/40 focus:border-[#F2B705] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#EADBC2]/90">Message *</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Include product weights, destination city/country, or questions..."
                  className="mt-1 w-full rounded-lg border border-[#D98A1C]/25 bg-[#140D08] px-3 py-2.5 text-sm text-[#FFF8EC] placeholder:text-[#EADBC2]/40 focus:border-[#F2B705] focus:outline-none"
                />
              </div>

              {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
              {sentMessage && <p className="text-xs text-emerald-400">{sentMessage}</p>}

              <button
                type="submit"
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#E59A1A] px-5 py-3 text-xs font-semibold text-[#180F07] hover:bg-[#F2B705] disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending Inquiry...' : 'Send Business Inquiry'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
