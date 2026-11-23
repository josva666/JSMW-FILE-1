import { useState, type FormEvent } from 'react';
import { ExternalLink, FileText, ShieldAlert, Star, X } from 'lucide-react';
import type { CertificateDoc, CustomerReview } from '../types/store';

interface CertificationsReviewsSectionProps {
  certificates: CertificateDoc[];
  reviews: CustomerReview[];
  onOpenAdmin: () => void;
  onReviewSubmitted: (review: CustomerReview) => void;
}

export function CertificationsReviewsSection({
  certificates,
  reviews,
  onOpenAdmin,
  onReviewSubmitted,
}: CertificationsReviewsSectionProps) {
  const [activeDoc, setActiveDoc] = useState<CertificateDoc | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitStatus(null);
    try {
      const resp = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, location, rating, comment }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSubmitError(data.error || 'Could not submit review.');
      } else {
        onReviewSubmitted(data.review);
        setCustomerName('');
        setLocation('');
        setRating(5);
        setComment('');
        setSubmitStatus('Thank you. Your customer review has been recorded.');
      }
    } catch {
      setSubmitError('Network error while submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Licenses & Certifications */}
      <section
        id="certifications"
        className="border-t border-[#3B2313]/10 bg-[#F3ECE0] py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-[#A8640B]">
                Verified Compliance & Documentation
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#23150B]">
                Licenses & Certifications
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#5E422C]">
                Only genuine, uploaded certificates and regulatory documents are displayed here. JSMW never displays fabricated or placeholder credentials.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="self-start rounded-lg border border-[#3B2313]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#23150B] hover:bg-[#FAF6EE] transition-colors whitespace-nowrap"
            >
              Manage Certificates in Admin
            </button>
          </div>

          {certificates.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-[#3B2313]/12 bg-white p-8 sm:p-10">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#A8640B]" />
                  <div>
                    <h3 className="font-display text-xl font-semibold text-[#23150B]">
                      No Certificates Uploaded Yet
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-[#5E422C]">
                      Upload genuine business licenses, food safety registrations (e.g., FSSAI), or lab test PDFs and certificate images in the Administration Dashboard with their issuing authority, registration number, and validity dates.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="rounded-lg bg-[#23150B] px-4 py-2.5 text-xs font-semibold text-[#FAF6EE] hover:bg-[#3A2414] whitespace-nowrap"
                >
                  Upload Certificate
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {certificates.map((doc) => (
                <article
                  key={doc.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-[#3B2313]/12 bg-white"
                >
                  <div className="aspect-[4/3] w-full bg-[#EFE6D4] flex items-center justify-center overflow-hidden">
                    {doc.fileType === 'image' ? (
                      <img
                        src={doc.fileUrl}
                        alt={doc.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <FileText className="h-12 w-12 text-[#A8640B]" />
                        <p className="mt-2 text-xs font-medium text-[#4A2E19]">{doc.fileName}</p>
                        <p className="mt-0.5 text-[11px] text-[#7D5B3E]">PDF Document</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-xl font-semibold text-[#23150B]">
                      {doc.title}
                    </h3>
                    <dl className="mt-3 space-y-1.5 text-xs text-[#5E422C]">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#8E6D51]">Issuing Authority</dt>
                        <dd className="font-medium text-right text-[#23150B]">{doc.authority}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#8E6D51]">Registration No.</dt>
                        <dd className="font-mono-tabular font-medium text-right text-[#23150B]">
                          {doc.registrationNumber}
                        </dd>
                      </div>
                      {doc.validityDate && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#8E6D51]">Valid Until</dt>
                          <dd className="font-mono-tabular font-medium text-right text-[#23150B]">
                            {doc.validityDate}
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="mt-4 pt-3 border-t border-[#3B2313]/10 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setActiveDoc(doc)}
                        className="text-xs font-semibold text-[#A8640B] hover:text-[#23150B]"
                      >
                        Inspect Document
                      </button>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#5E422C] hover:text-[#23150B]"
                      >
                        Open File
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Customer Reviews */}
      <section id="reviews" className="border-t border-[#3B2313]/10 bg-[#FAF6EE] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Left: Published Genuine Reviews */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#A8640B]">
                  Customer Feedback
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#23150B]">
                  Customer Reviews
                </h2>
                <p className="mt-2 text-sm sm:text-base text-[#5E422C]">
                  Genuine feedback submitted by JSMW customers and managed by store administrators.
                </p>
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-[#3B2313]/12 bg-white p-8">
                  <p className="font-display text-xl font-semibold text-[#23150B]">
                    No Customer Reviews Yet
                  </p>
                  <p className="mt-1.5 text-sm text-[#5E422C]">
                    We display only authentic customer experiences. Submit a review using the form alongside or add verified customer testimonials in the Administration Dashboard.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <article
                      key={rev.id}
                      className="rounded-xl border border-[#3B2313]/12 bg-white p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1" aria-label={`${rev.rating} out of 5 stars`}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < rev.rating
                                  ? 'fill-[#E59A1A] text-[#E59A1A]'
                                  : 'text-[#D6C8B0]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-mono-tabular text-xs text-[#7D5B3E]">
                          {rev.reviewDate}
                        </span>
                      </div>
                      <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#3B2313]">
                        “{rev.comment}”
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#6B4D35]">
                        <span className="font-semibold text-[#23150B]">{rev.customerName}</span>
                        {rev.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{rev.location}</span>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Share a Genuine Review Form */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleReviewSubmit}
                className="rounded-2xl border border-[#3B2313]/12 bg-white p-6 sm:p-8 space-y-4"
              >
                <h3 className="font-display text-2xl font-semibold text-[#23150B]">
                  Share Your Review
                </h3>
                <p className="text-xs text-[#6B4D35]">
                  Ordered JSMW Sirumalai Wild Honey? Leave your honest rating and review below.
                </p>

                <div>
                  <label className="block text-xs font-medium text-[#3B2313]">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-[#FAF6EE] px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-[#3B2313]">
                      City / Country
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Chennai, India"
                      className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-[#FAF6EE] px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3B2313]">Rating</label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-[#FAF6EE] px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                    >
                      <option value={5}>5 Stars — Excellent</option>
                      <option value={4}>4 Stars — Very Good</option>
                      <option value={3}>3 Stars — Good</option>
                      <option value={2}>2 Stars — Fair</option>
                      <option value={1}>1 Star — Needs Improvement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3B2313]">
                    Your Feedback *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with taste, aroma, packaging, or delivery..."
                    className="mt-1 w-full rounded-lg border border-[#3B2313]/15 bg-[#FAF6EE] px-3 py-2 text-sm focus:border-[#C87D16] focus:outline-none"
                  />
                </div>

                {submitError && <p className="text-xs text-red-700">{submitError}</p>}
                {submitStatus && <p className="text-xs text-emerald-800">{submitStatus}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#23150B] px-4 py-3 text-xs font-semibold text-[#FAF6EE] hover:bg-[#3A2414] disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Document Inspector Modal */}
      {activeDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeDoc.title}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#FAF6EE] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3B2313]/10 px-6 py-4">
              <div>
                <h3 className="font-display text-2xl font-semibold text-[#23150B]">
                  {activeDoc.title}
                </h3>
                <p className="text-xs text-[#6B4D35]">
                  {activeDoc.authority} · Reg: {activeDoc.registrationNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                aria-label="Close document preview"
                className="rounded-lg p-2 text-[#3B2313] hover:bg-[#EFE6D4]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#E9E0CF]">
              {activeDoc.fileType === 'image' ? (
                <img
                  src={activeDoc.fileUrl}
                  alt={activeDoc.title}
                  referrerPolicy="no-referrer"
                  className="mx-auto max-h-[70vh] rounded-lg object-contain"
                />
              ) : (
                <iframe
                  src={activeDoc.fileUrl}
                  title={activeDoc.title}
                  className="h-[70vh] w-full rounded-lg bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
