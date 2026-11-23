import { useState } from 'react';
import { Briefcase, GraduationCap, Languages, User } from 'lucide-react';
import type { CoFounderProfile, CompanyInfo, OwnerProfile } from '../types/store';

interface AboutOwnerSectionProps {
  company: CompanyInfo;
  owner: OwnerProfile;
  coFounder: CoFounderProfile;
  onOpenAdmin: () => void;
}

const DEFAULT_COMPANY_TAMIL: Record<string, string> = {
  'Based in Dindigul, Tamil Nadu, India, JSMW – Jose Sirumalai Wild Honey brings natural wild honey harvested around the Sirumalai hills directly to households across India and international destinations. Official founding dates and company milestones can be added by the administrator.':
    'தமிழ்நாட்டின் திண்டுக்கல்லைத் தலைமையிடமாகக் கொண்ட JSMW – ஜோஸ் சிறுமலை காட்டுத் தேன் நிறுவனம், சிறுமலைக் குன்றுகளில் சேகரிக்கப்படும் இயற்கையான காட்டுத் தேனை இந்தியா முழுவதும் மற்றும் உலக நாடுகளின் இல்லங்களுக்கும் நேரடியாக வழங்குகிறது.',
  'Our brand narrative focuses on transparent, minimally handled wild honey from Dindigul, preserving the natural colour, viscosity, and seasonal floral character of each harvest. Administrators can update this story anytime from the dashboard.':
    'ஒவ்வொரு அறுவடையின் இயற்கை நிறம், அடர்த்தி மற்றும் பருவகால மலர் மணத்தைச் சிதைக்காமல், திண்டுக்கல்லில் இருந்து குறைந்தபட்ச கையாளுதலுடன் வெளிப்படையான தூய காட்டுத் தேனை வழங்குவதே எங்கள் பிராண்டின் அடிப்படைக் கதையாகும்.',
  'Honey is sourced from traditional forest and hill-margin foraging zones in and around Sirumalai, Dindigul district, Tamil Nadu, with seasonal floral variation reflected in every batch.':
    'தமிழ்நாட்டின் திண்டுக்கல் மாவட்டம் சிறுமலை மற்றும் அதனைச் சுற்றியுள்ள பாரம்பரிய வனப் பகுதிகளில் இருந்து தேன் சேகரிக்கப்படுகிறது; ஒவ்வொரு தொகுப்பிலும் பருவகால மலர்களின் தனித்துவம் பிரதிபலிக்கிறது.',
  'To offer genuine, minimally processed natural wild honey from Dindigul with honest product documentation, transparent sourcing, and reliable domestic and international fulfilment.':
    'நேர்மையான தயாரிப்பு விவரங்கள், வெளிப்படையான சேகரிப்பு முறை மற்றும் நம்பகமான உள்நாட்டு மற்றும் சர்வதேச விநியோகத்துடன் திண்டுக்கல்லில் இருந்து தூய, குறைந்தபட்சம் பதப்படுத்தப்பட்ட இயற்கை காட்டுத் தேனை வழங்குவது.',
  'To represent Sirumalai wild honey from Tamil Nadu on the international stage through integrity, traceability, and unhurried artisanal care.':
    'நேர்மை, நம்பகமான மூல ஆதாரம் மற்றும் நுட்பமான பாரம்பரியப் பராமரிப்பு ஆகியவற்றின் மூலம் தமிழ்நாட்டின் சிறுமலை காட்டுத் தேனை உலக அரங்கில் சிறப்பாகப் பிரதிநிதித்துவப்படுத்துவது.',
  'Honest Provenance from Dindigul, Tamil Nadu':
    'திண்டுக்கல், தமிழ்நாட்டில் இருந்து நேர்மையான மூல ஆதாரம்',
  'Minimal Handling Without Artificial Additives':
    'செயற்கை சேர்க்கைகள் இன்றி குறைந்தபட்ச கையாளுதல்',
  'Transparent Documentation & Customer Care':
    'வெளிப்படையான சான்றுகள் & வாடிக்கையாளர் சேவை',
  'Responsible Domestic & Worldwide Fulfilment':
    'பொறுப்பான உள்நாட்டு மற்றும் உலகளாவிய விநியோகம்',
};

function toTamilOrKeep(text: string): string {
  const trimmed = text.trim();
  return DEFAULT_COMPANY_TAMIL[trimmed] ?? text;
}

export function AboutOwnerSection({
  company,
  owner,
  coFounder,
  onOpenAdmin,
}: AboutOwnerSectionProps) {
  const [aboutLang, setAboutLang] = useState<'en' | 'ta'>('en');
  const isTa = aboutLang === 'ta';

  return (
    <div className="border-t border-[#3B2313]/10 bg-[#F3ECE0]">
      {/* About Us Section */}
      <section
        id="about"
        lang={isTa ? 'ta' : 'en'}
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      >
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-[#3B2313]/12 bg-[#E8DEC8]">
              <img
                src="/src/assets/images/about_sirumalai_hills_1795429480706.jpg"
                alt={
                  isTa
                    ? 'திண்டுக்கல், தமிழ்நாட்டில் உள்ள சிறுமலைக் குன்றுகளின் காலைக் காட்சி'
                    : 'Sirumalai hills in Dindigul, Tamil Nadu at dawn'
                }
                referrerPolicy="no-referrer"
                className="h-[300px] sm:h-[340px] w-full object-cover"
              />
            </div>

            {/* Sirumalai Hills History & Two Highlight Points Beside Company History */}
            <div className="rounded-2xl border border-[#3B2313]/12 bg-[#FAF6EE] p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#A8640B]">
                  {isTa
                    ? 'மலையும் அதன் பாரம்பரியமும் · கிழக்குத் தொடர்ச்சி மலை, திண்டுக்கல்'
                    : 'The Mountain & Its Heritage · Eastern Ghats, Dindigul'}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-[#23150B]">
                  {isTa
                    ? 'சிறுமலை: அமைவிடம், தாவர வளம் & வரலாறு'
                    : 'Sirumalai Hills: Location, Flora & History'}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#4A2E19]">
                  {isTa
                    ? 'தமிழ்நாட்டின் திண்டுக்கல்லுக்குத் தெற்கே சுமார் 25 கிலோமீட்டர் தொலைவிலும் மதுரைக்கு வடக்கே 40 கிலோமீட்டர் தொலைவிலும் அமைந்துள்ள சிறுமலைத் தொடர், கிழக்குத் தொடர்ச்சி மலையின் தென்முனையாகக் கடல் மட்டத்திலிருந்து சுமார் 1,600 மீட்டர் உயரத்தில் பசுமைப் பீடபூமியாக உயர்ந்துள்ளது. திண்டுக்கல்லில் இருந்து 18 அழகிய கொண்டைஊசி வளைவுகளைக் கடந்து செல்லும் இந்த மலைத்தொடர், கிட்டத்தட்ட 200 சதுர கிலோமீட்டர் பரப்பளவிலான பாதுகாக்கப்பட்ட வனப்பகுதி, குளிர்ந்த மூடுபனிச் சிகரங்கள் மற்றும் வளமான மலைச் சரிவுகளைக் கொண்டுள்ளது. பல நூற்றாண்டுகளாகத் தமிழ் சித்த மருத்துவ மரபிலும் நாட்டுப்புற வரலாற்றிலும் அரிய மூலிகைகள், நறுமண மலர்கள் மற்றும் அடர்ந்த பசுமைமாறாக் காடுகளுக்காகச் சிறுமலை போற்றப்படுகிறது. பழையூர், தேன்மலை மற்றும் அகத்தியர் பெயர் கொண்ட மலைப் பகுதிகளில் பாரம்பரியக் காபி, மிளகு, பலா மற்றும் புவிசார் குறியீடு பெற்ற சிறுமலை மலைவாழை ஆகியவற்றுடன் இயற்கை காட்டுத் தேன் சேகரிப்பும் தலைமுறை தலைமுறையாகப் பாதுகாக்கப்பட்டு வருகிறது. வெள்ளிமலை முருகன் திருக்கோயில் போன்ற வரலாற்றுச் சிறப்புமிக்க அடையாளங்களும் மலை மக்களின் இயற்கை பாதுகாப்பும் இன்றும் தூய காட்டுத் தேனீக் கூட்டங்களையும் பருவகால மலர்களையும் காத்து வருகின்றன.'
                    : 'Situated roughly 25 kilometres south of Dindigul and 40 kilometres north of Madurai in Tamil Nadu, the Sirumalai hill range rises as the southern spur of the Eastern Ghats across lush undulating plateaus reaching around 1,600 metres in elevation. Accessed along eighteen scenic hairpin bends winding up from Dindigul, the massif spans nearly 200 square kilometres of protected reserve forest, cool misty ridges, and fertile hill slopes. For centuries, Tamil Siddha tradition and regional folklore have revered Sirumalai for its wild medicinal herbs, fragrant flora, and unbroken canopy of mixed deciduous and semi-evergreen trees. Historic hill hamlets settled across Pazhaiyur, Thenmalai, and Agasthiar-named groves have long sustained traditional cultivation of coffee, black pepper, jackfruit, and the GI-tagged Sirumalai hill banana alongside chemical-free forest foraging. Preserved landmarks such as the Vellimalai Murugan temple and historic hill estates reflect generations of community stewardship that continue to shield wild bee colonies and pure seasonal blossoms today.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-[#3B2313]/10 pt-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#3B2313]/10 bg-[#F3ECE0] p-4">
                  <p className="text-xs font-semibold text-[#A8640B]">
                    {isTa ? '01 · அமைவிடம் & வனப் போர்வை' : '01 · Location & Forest Canopy'}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#4A2E19]">
                    {isTa
                      ? 'திண்டுக்கல்லில் இருந்து ~25 கி.மீ. தொலைவில் கிழக்குத் தொடர்ச்சி மலையின் தென்முனையில், 18 கொண்டைஊசி வளைவுகள் வழியே அடர்ந்த வனப்பகுதியிலும் குளிர் பள்ளத்தாக்குகளிலும் அமைந்துள்ளது.'
                      : 'Located ~25 km from Dindigul at the southern tip of the Eastern Ghats, climbing 18 hairpin bends into dense forest ridges and cool botanical valleys.'}
                  </p>
                </div>
                <div className="rounded-xl border border-[#3B2313]/10 bg-[#F3ECE0] p-4">
                  <p className="text-xs font-semibold text-[#A8640B]">
                    {isTa
                      ? '02 · பாரம்பரியம் & காட்டுத் தேன் சேகரிப்பு'
                      : '02 · Heritage & Wild Foraging'}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#4A2E19]">
                    {isTa
                      ? 'மருத்துவத் தாவரங்கள் மற்றும் மலைப் பயிர்களுக்காகத் தமிழ் மருத்துவ மரபில் போற்றப்படும் இப்பகுதியில், பல தலைமுறைகளாகக் குறைந்தபட்ச கையாளுதலுடன் காட்டுத் தேன் சேகரிக்கப்படுகிறது.'
                      : 'Celebrated in Tamil herbal lore for medicinal flora and hill crops, supporting multi-generational wild honey gathering with minimal handling.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#A8640B]">
                  {isTa
                    ? 'JSMW பற்றி · திண்டுக்கல், தமிழ்நாடு, இந்தியா'
                    : 'About JSMW · Dindigul, Tamil Nadu, India'}
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#23150B]">
                  {isTa
                    ? 'சிறுமலைத் தொடரில் வேரூன்றிய பாரம்பரியம்'
                    : 'Rooted in the Sirumalai Hills'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setAboutLang((prev) => (prev === 'en' ? 'ta' : 'en'))}
                aria-label={
                  isTa ? 'Switch About Us to English' : 'Translate About Us to Tamil'
                }
                className="inline-flex items-center gap-2 rounded-lg border border-[#A8640B]/35 bg-[#FAF6EE] px-3.5 py-2 text-xs font-semibold text-[#23150B] shadow-sm hover:border-[#A8640B] hover:bg-[#EFE4CE] transition-colors whitespace-nowrap"
              >
                <Languages className="h-4 w-4 text-[#A8640B]" />
                {isTa ? 'Read in English' : 'தமிழில் படிக்க · Tamil'}
              </button>
            </div>

            <div className="space-y-5 text-sm sm:text-base leading-relaxed text-[#4A2E19]">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#23150B]">
                  {isTa
                    ? 'நிறுவன வரலாறு & பிராண்ட் கதை'
                    : 'Company History & Brand Story'}
                </h3>
                <p className="mt-1.5">{isTa ? toTamilOrKeep(company.history) : company.history}</p>
                <p className="mt-2">
                  {isTa ? toTamilOrKeep(company.brandStory) : company.brandStory}
                </p>
              </div>

              <div className="border-t border-[#3B2313]/10 pt-4">
                <h3 className="font-display text-xl font-semibold text-[#23150B]">
                  {isTa ? 'இயற்கை தேன் சேகரிப்பு முறை' : 'Natural Honey Sourcing'}
                </h3>
                <p className="mt-1.5">
                  {isTa ? toTamilOrKeep(company.sourcingInfo) : company.sourcingInfo}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 border-t border-[#3B2313]/10 pt-5 sm:grid-cols-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-[#23150B]">
                  {isTa ? 'நோக்கம்' : 'Mission'}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#5E422C]">
                  {isTa ? toTamilOrKeep(company.mission) : company.mission}
                </p>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-[#23150B]">
                  {isTa ? 'தொலைநோக்குப் பார்வை' : 'Vision'}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#5E422C]">
                  {isTa ? toTamilOrKeep(company.vision) : company.vision}
                </p>
              </div>
            </div>

            <div className="border-t border-[#3B2313]/10 pt-4">
              <h3 className="font-display text-lg font-semibold text-[#23150B]">
                {isTa ? 'நிறுவன விழுமியங்கள்' : 'Company Values'}
              </h3>
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm text-[#4A2E19]">
                {company.values.map((val, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C87D16]" />
                    <span>{isTa ? toTamilOrKeep(val) : val}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Profile & Co-Founder / Manager Section */}
      <section
        id="founder"
        className="border-t border-[#3B2313]/10 bg-[#FAF6EE] py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Primary Founder Profile with Larger Left Photo */}
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            {/* Enlarged Editable Founder Photograph */}
            <div className="lg:col-span-5 flex">
              <div className="w-full overflow-hidden rounded-2xl border border-[#3B2313]/14 bg-[#F0E6D4] shadow-sm">
                {owner.photoUrl ? (
                  <img
                    src={owner.photoUrl}
                    alt={`${owner.name} — ${owner.roleTitle}`}
                    referrerPolicy="no-referrer"
                    className="h-full min-h-[420px] sm:min-h-[520px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[420px] sm:min-h-[520px] w-full flex-col items-center justify-center p-10 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[#C87D16]/45 bg-[#FAF6EE] shadow-inner">
                      <User className="h-11 w-11 text-[#A8640B]" />
                    </div>
                    <p className="mt-5 font-display text-3xl font-semibold text-[#23150B]">
                      {owner.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#6B4D35]">
                      Founder · Portrait Ready for Upload
                    </p>
                    <button
                      type="button"
                      onClick={onOpenAdmin}
                      className="mt-5 rounded-lg border border-[#3B2313]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#23150B] hover:bg-[#EFE6D4] transition-colors"
                    >
                      Upload Founder Photo in Admin
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Founder Biography, Education & Leadership Details */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#A8640B]">
                  Founder Profile
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-5xl font-semibold text-[#23150B]">
                  {owner.name}
                </h2>
                <p className="mt-1.5 text-sm sm:text-base font-medium text-[#6B4D35]">
                  {owner.roleTitle}
                </p>
              </div>

              <p className="text-base leading-relaxed text-[#3B2313]">{owner.biography}</p>

              {/* Prominent Education & Qualifications Card */}
              <div className="rounded-xl border border-[#C87D16]/25 bg-[#F4EAD6]/70 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#A8640B]">
                  <GraduationCap className="h-4 w-4 text-[#A8640B]" />
                  Education & Qualifications
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#23150B]">
                  {owner.education ||
                    'Academic qualifications and certifications can be added in the Administration Dashboard.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 border-t border-[#3B2313]/10 pt-6 md:grid-cols-3">
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#23150B]">
                    Professional Background
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5E422C]">
                    {owner.professionalBackground}
                  </p>
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#23150B]">
                    Company Journey
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5E422C]">
                    {owner.companyJourney}
                  </p>
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-[#23150B]">
                    Vision Forward
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5E422C]">{owner.vision}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Co-Founder / Manager Slot Below Founder */}
          <div className="rounded-2xl border border-[#3B2313]/12 bg-[#F3ECE0] p-6 sm:p-8">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="overflow-hidden rounded-xl border border-[#3B2313]/12 bg-[#E8DEC8]">
                  {coFounder.photoUrl ? (
                    <img
                      src={coFounder.photoUrl}
                      alt={`${coFounder.name} — ${coFounder.roleTitle}`}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/4] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/4] w-full flex-col items-center justify-center p-6 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C87D16]/40 bg-[#FAF6EE]">
                        <User className="h-7 w-7 text-[#A8640B]" />
                      </div>
                      <p className="mt-3 font-display text-xl font-semibold text-[#23150B]">
                        {coFounder.name}
                      </p>
                      <p className="mt-1 text-xs text-[#6B4D35]">
                        Co-Founder / Manager photo slot
                      </p>
                      <button
                        type="button"
                        onClick={onOpenAdmin}
                        className="mt-4 rounded-lg border border-[#3B2313]/20 bg-white px-3.5 py-2 text-xs font-medium text-[#23150B] hover:bg-[#FAF6EE]"
                      >
                        Upload Photo in Admin
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-5">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-[#A8640B]">
                    Co-Founder / Manager
                  </p>
                  <h3 className="mt-1.5 font-display text-2xl sm:text-3xl font-semibold text-[#23150B]">
                    {coFounder.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-[#6B4D35]">{coFounder.roleTitle}</p>
                </div>

                <p className="text-sm sm:text-base leading-relaxed text-[#3B2313]">
                  {coFounder.biography}
                </p>

                <div className="grid grid-cols-1 gap-4 border-t border-[#3B2313]/10 pt-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#3B2313]/10 bg-[#FAF6EE] p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A8640B]">
                      <GraduationCap className="h-3.5 w-3.5" />
                      Education & Qualifications
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#4A2E19]">
                      {coFounder.education}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#3B2313]/10 bg-[#FAF6EE] p-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A8640B]">
                      <Briefcase className="h-3.5 w-3.5" />
                      Operations & Responsibilities
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#4A2E19]">
                      {coFounder.responsibilities}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
