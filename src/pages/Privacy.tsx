import {
  LegalA,
  LegalH2,
  LegalLi,
  LegalNote,
  LegalP,
  LegalShell,
  LegalUl,
} from "@/components/ui/legal-doc";

// TODO: replace with the real public support address + domain once live.
const CONTACT_EMAIL = "support@learn2lead.in";
const LAST_UPDATED = "September 7, 2026";

export default function Privacy() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      summary="How Learn2Lead collects, uses, protects and shares your information — and the rights you hold over it — across our academia–industry platform in India."
      updated={LAST_UPDATED}
    >
      <LegalH2>1. Who we are</LegalH2>
      <LegalP>
        Learn2Lead (“we”, “our”, “us”) operates an academia–industry platform that helps students and young
        professionals in India discover courses, scholarships, internships and jobs, and lets institutions,
        faculty and employers collaborate around verified skills. This policy explains what information we
        process, why we process it, and the choices you have.
      </LegalP>

      <LegalH2>2. Information we collect</LegalH2>
      <LegalUl>
        <LegalLi>
          <strong className="text-white/85">Account details</strong> — name, email address, phone number, and the
          profile type you sign up with (student, institution, faculty, employer).
        </LegalLi>
        <LegalLi>
          <strong className="text-white/85">Profile information</strong> — institution, course, department, year,
          location, target role and similar details you add to your profile.
        </LegalLi>
        <LegalLi>
          <strong className="text-white/85">Skill passport & evidence</strong> — skills you claim and documents you
          upload as evidence (certificates, transcripts, project work), which are used for verification.
        </LegalLi>
        <LegalLi>
          <strong className="text-white/85">Activity</strong> — applications you make, opportunities you post,
          verifications and ratings you give or receive, and settings you save.
        </LegalLi>
        <LegalLi>
          <strong className="text-white/85">Technical information</strong> — basic device, browser and usage data
          needed to keep the platform secure and working (see “Cookies” below).
        </LegalLi>
      </LegalUl>

      <LegalH2>3. How we use your information</LegalH2>
      <LegalP>We use the information we collect to:</LegalP>
      <LegalUl>
        <LegalLi>Provide and operate your account and role dashboard;</LegalLi>
        <LegalLi>Match students to opportunities, resources and courses based on their goals and verified skills;</LegalLi>
        <LegalLi>Support evidence-backed skill verification and protect the integrity of profiles (including anomaly detection for suspected false claims);</LegalLi>
        <LegalLi>Allow institutions, faculty and employers to run the programme features you opt into;</LegalLi>
        <LegalLi>Send service communications, respond to support requests, and meet legal obligations;</LegalLi>
        <LegalLi>Measure and improve the platform using aggregated, anonymised statistics.</LegalLi>
      </LegalUl>

      <LegalH2>4. Legal basis & consent</LegalH2>
      <LegalP>
        Under the Digital Personal Data Protection Act, 2023 (DPDP Act) and applicable law, we process your
        personal data on the basis of your consent, for the performance of the service you have asked for, or
        where we have a legitimate interest or a legal obligation. Where consent is the basis, you may withdraw
        it at any time by writing to{" "}
        <LegalA href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalA> — withdrawal does not affect the
        lawfulness of processing before the withdrawal.
      </LegalP>

      <LegalH2>5. How we share information</LegalH2>
      <LegalP>We do not sell your personal data. We share it only where necessary to run the platform:</LegalP>
      <LegalUl>
        <LegalLi>
          <strong className="text-white/85">With your institution</strong> — so faculty and institutional admins
          can deliver the skill, curriculum and placement programme you are part of.
        </LegalLi>
        <LegalLi>
          <strong className="text-white/85">With employers & partners</strong> — when you apply to or engage with
          an opportunity they have posted.
        </LegalLi>
        <LegalLi>
          <strong className="text-white/85">With verifiers</strong> — when faculty or institution staff review
          evidence you submitted for verification.
        </LegalLi>
        <LegalLi>
          <strong className="text-white/85">With service providers</strong> — hosting, email and analytics vendors
          that process data on our behalf under contract.
        </LegalLi>
        <LegalLi>
          <strong className="text-white/85">Where required by law</strong> — to comply with legal process or
          protect the rights and safety of users and the platform.
        </LegalLi>
      </LegalUl>
      <LegalP>
        Department and institution reports shared within the platform contain only aggregated counts and
        percentages — never individual student records.
      </LegalP>

      <LegalH2>6. Retention</LegalH2>
      <LegalP>
        We keep your information only as long as needed for the purposes in this policy, to comply with legal and
        audit requirements, or until you ask us to delete it. Evidence and verification records may be retained
        longer where institutions have a legitimate programme or compliance need for them.
      </LegalP>

      <LegalH2>7. Security</LegalH2>
      <LegalP>
        We use appropriate technical and organisational measures — including encryption in transit, access
        controls and role-based permissions — to protect your data. No method of transmission or storage is
        completely secure, and we cannot guarantee absolute security.
      </LegalP>

      <LegalH2>8. Your rights</LegalH2>
      <LegalP>
        Under the DPDP Act you have rights to access, correct, complete, update and erase your personal data, and
        to request a grievance to be addressed. To exercise any of these rights, email{" "}
        <LegalA href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalA> with your account email and the change
        you are requesting. We will respond within the timeframes required by law. If you are not satisfied, you
        can escalate to the Data Protection Board of India.
      </LegalP>
      <LegalNote>
        You can also delete data directly in the product: remove skill claims and documents you added, and write
        to {CONTACT_EMAIL} to close your account and erase your profile. Where your institution manages your
        programme participation, they may need to be involved in account changes.
      </LegalNote>

      <LegalH2>9. Students and minors</LegalH2>
      <LegalP>
        Our platform serves students, some of whom may be under 18. Where you are below the applicable age of
        consent, please have a parent or guardian review this policy and complete sign-up with you. Institutions
        that onboard student cohorts are responsible for confirming they have the authority to do so. If you
        believe a minor’s data was provided without appropriate consent, contact us and we will remove it.
      </LegalP>

      <LegalH2>10. Cookies & tracking</LegalH2>
      <LegalP>
        We do not use advertising trackers or sell browsing data. We use only the minimal storage needed to keep
        you signed in and to measure aggregated, privacy-friendly site usage. You can clear this data in your
        browser at any time.
      </LegalP>

      <LegalH2>11. Links to other sites</LegalH2>
      <LegalP>
        Courses, resources, employers and institutions listed on the platform may link to third-party websites.
        Their privacy practices are their own — we encourage you to review them before sharing data.
      </LegalP>

      <LegalH2>12. Changes to this policy</LegalH2>
      <LegalP>
        We may update this policy as the platform evolves or the law changes. Material changes will be announced
        on the platform and this page will always show the latest effective date.
      </LegalP>

      <LegalH2>13. Contact</LegalH2>
      <LegalP>
        Questions, requests or complaints about this policy or your data can be sent to{" "}
        <LegalA href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalA>. We will treat your message as a formal
        grievance where required under the DPDP Act.
      </LegalP>
    </LegalShell>
  );
}
