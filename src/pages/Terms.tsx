import {
  LegalA,
  LegalH2,
  LegalLi,
  LegalNote,
  LegalP,
  LegalShell,
  LegalUl,
} from "@/components/ui/legal-doc";

// TODO: replace with the real public support address once live.
const CONTACT_EMAIL = "support@learn2lead.in";
const LAST_UPDATED = "September 7, 2026";

export default function Terms() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of Service"
      summary="The rules for using Learn2Lead — including account responsibilities, the integrity of verified skills, and what you can expect from the platform and from us."
      updated={LAST_UPDATED}
    >
      <LegalH2>1. The agreement</LegalH2>
      <LegalP>
        By creating an account or using Learn2Lead (“the platform”), you agree to these Terms of Service and to
        our <LegalA href="/privacy">Privacy Policy</LegalA>. If you are using the platform on behalf of an
        institution or company, you confirm you are authorised to accept these terms on its behalf. We may update
        these terms from time to time; the latest version always applies.
      </LegalP>

      <LegalH2>2. Eligibility & accounts</LegalH2>
      <LegalUl>
        <LegalLi>You must provide accurate, current information and keep your login details confidential.</LegalLi>
        <LegalLi>
          One account per person per role (student, faculty, institution admin or employer). Sharing accounts or
          creating accounts for others without authorisation is not allowed.
        </LegalLi>
        <LegalLi>
          If you are under 18, please review these terms with a parent or guardian, who can help you register and
          is responsible for supervising your use.
        </LegalLi>
        <LegalLi>
          Institution staff who manage student cohorts must have the authority to do so and to enter the relevant
          information.
        </LegalLi>
      </LegalUl>

      <LegalH2>3. What the platform is (and is not)</LegalH2>
      <LegalP>
        The platform connects students, institutions, faculty and employers and provides tools for skills,
        opportunities, placements and reports. Courses, scholarships, internships, jobs and other listings come
        from third-party providers, employers and institutions. We do not guarantee that any listing is accurate,
        current, or that you will secure any admission, internship, placement or job. Verify important details
        with the provider directly.
      </LegalP>

      <LegalH2>4. Acceptable use</LegalH2>
      <LegalP>You agree not to misuse the platform, including by:</LegalP>
      <LegalUl>
        <LegalLi>Submitting false, misleading or fabricated evidence, skills, achievements or records;</LegalLi>
        <LegalLi>Impersonating another person, role, institution or organisation;</LegalLi>
        <LegalLi>Attempting to access another user’s account or data without authorisation;</LegalLi>
        <LegalLi>Uploading malware, scraping beyond reasonable use, or otherwise disrupting the service;</LegalLi>
        <LegalLi>Posting unlawful, infringing, harassing or defamatory content;</LegalLi>
        <LegalLi>Using the platform in a way that violates Indian law.</LegalLi>
      </LegalUl>

      <LegalH2>5. Skill passports & evidence integrity</LegalH2>
      <LegalP>
        The core promise of the platform is that skills are evidence-backed. When you submit a claim or evidence:
      </LegalP>
      <LegalUl>
        <LegalLi>
          It may be reviewed by your institution or faculty and marked <em>verified</em>, <em>needs review</em> or{" "}
          <em>processing</em>;
        </LegalLi>
        <LegalLi>
          The platform may flag anomalies (for example, duplicate or suspicious records) for institutional review;
        </LegalLi>
        <LegalLi>
          Knowingly submitting false evidence is a breach of these terms and may lead to removal of claims,
          suspension or termination of your account, and reporting to your institution.
        </LegalLi>
      </LegalUl>

      <LegalH2>6. Your content & our licence</LegalH2>
      <LegalP>
        You keep ownership of the content you submit (evidence, profile information, opportunity listings, ratings
        and messages). You grant us a limited licence to store, display and process that content solely to operate
        and improve the platform. You confirm that content you submit is yours or that you have the right to share
        it, and that it doesn’t infringe anyone else’s rights.
      </LegalP>

      <LegalH2>7. Our intellectual property</LegalH2>
      <LegalP>
        The Learn2Lead name, logos, design and software are owned by us or our licensors. You may not copy,
        modify, resell or create derivative works from them except as needed to use the platform normally.
      </LegalP>

      <LegalH2>8. Disclaimers</LegalH2>
      <LegalP>
        The platform is provided “as is” and “as available”. To the maximum extent permitted by law, we make no
        warranties that the service will be uninterrupted, error-free, or that outcomes (admissions, internships,
        placements, jobs, verification results) will be achieved. Rankings, matches and readiness scores are
        informational aids, not guarantees of outcomes.
      </LegalP>

      <LegalH2>9. Limitation of liability</LegalH2>
      <LegalP>
        To the maximum extent permitted by law, Learn2Lead and its operators will not be liable for indirect,
        incidental, special or consequential damages, or for loss of data, opportunities or profits, arising out
        of your use of the platform. Nothing in these terms limits liability that cannot be limited under
        applicable Indian law.
      </LegalP>

      <LegalH2>10. Suspension & termination</LegalH2>
      <LegalP>
        We may suspend or close accounts that breach these terms, that compromise the integrity of the platform
        (for example, through false evidence), or that are inactive as required by law or policy. You may close
        your account at any time by contacting{" "}
        <LegalA href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalA>.
      </LegalP>
      <LegalNote>
        Closing your account removes your access. Records that your institution is required to keep for its
        programmes may remain in aggregated or institution-held form, subject to our Privacy Policy.
      </LegalNote>

      <LegalH2>11. Governing law & disputes</LegalH2>
      <LegalP>
        These terms are governed by the laws of India. Disputes will first be raised with us at{" "}
        <LegalA href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalA> and, if unresolved, will be subject to
        the exclusive jurisdiction of the courts of New Delhi.
      </LegalP>

      <LegalH2>12. Contact</LegalH2>
      <LegalP>
        Questions about these terms can be sent to <LegalA href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalA>.
      </LegalP>
    </LegalShell>
  );
}
