// Static demo data for the Leads module. No backend calls exist yet — see
// specs/leads/leads-ui.md Implementation Notes. Shapes mirror the fields the
// companion backend spec (backend/specs/leads/leads-api.md) already defines,
// so swapping this file for real API responses later is a drop-in change.

export type LeadPriority = "low" | "medium" | "high" | "urgent";
export type LeadTemperature = "cold" | "warm" | "hot";
export type LeadActivityType = "call" | "email" | "meeting" | "note" | "whatsapp" | "sms" | "demo";

export interface LeadOwner {
  id: string;
  fullName: string;
}

export interface LeadStage {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface Lead {
  id: string;
  fullName: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  priority: LeadPriority;
  temperature: LeadTemperature;
  leadScore: number;
  value?: number;
  probability?: number;
  description?: string;
  statusId: string;
  assignedTo?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  activityType: LeadActivityType;
  subject: string;
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  note: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const DEMO_OWNERS: LeadOwner[] = [
  { id: "u1", fullName: "Aditi Sharma" },
  { id: "u2", fullName: "Rohan Mehta" },
  { id: "u3", fullName: "Priya Nair" },
  { id: "u4", fullName: "Karan Verma" },
];

export const DEMO_LEAD_STATUSES: LeadStage[] = [
  { id: "s1", name: "New", color: "var(--chart-1)", sortOrder: 1 },
  { id: "s2", name: "Contacted", color: "var(--chart-2)", sortOrder: 2 },
  { id: "s3", name: "Qualified", color: "var(--chart-3)", sortOrder: 3 },
  { id: "s4", name: "Proposal", color: "var(--chart-4)", sortOrder: 4 },
  { id: "s5", name: "Won", color: "var(--chart-5)", sortOrder: 5, isWon: true },
  { id: "s6", name: "Lost", color: "var(--destructive)", sortOrder: 6, isLost: true },
];

const iso = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

export const DEMO_LEADS: Lead[] = [
  { id: "l1", fullName: "Meera Iyer", email: "meera.iyer@brightbyte.io", mobile: "+91 98200 11223", companyName: "BrightByte Labs", designation: "Head of Growth", website: "brightbyte.io", priority: "high", temperature: "hot", leadScore: 82, value: 480000, probability: 70, description: "Wants a demo of the Ads Manager module before committing.", statusId: "s3", assignedTo: "u1", tags: ["enterprise", "ads"], createdAt: iso(18), updatedAt: iso(1) },
  { id: "l2", fullName: "Arjun Kapoor", email: "arjun@kapoortextiles.com", mobile: "+91 90210 44556", companyName: "Kapoor Textiles", designation: "Founder", priority: "medium", temperature: "warm", leadScore: 55, value: 120000, probability: 40, statusId: "s1", assignedTo: "u2", tags: ["smb"], createdAt: iso(4), updatedAt: iso(4) },
  { id: "l3", fullName: "Sneha Rao", email: "sneha.rao@finlanetworks.com", mobile: "+91 99000 77889", companyName: "Finla Networks", designation: "VP Sales", website: "finlanetworks.com", priority: "urgent", temperature: "hot", leadScore: 91, value: 950000, probability: 85, description: "Legal is already reviewing the contract.", statusId: "s4", assignedTo: "u1", tags: ["enterprise", "priority"], createdAt: iso(30), updatedAt: iso(0) },
  { id: "l4", fullName: "Vikram Singh", email: "vikram@singhauto.in", mobile: "+91 98765 12340", companyName: "Singh Auto Components", priority: "low", temperature: "cold", leadScore: 22, value: 60000, probability: 10, statusId: "s1", assignedTo: "u3", tags: [], createdAt: iso(2), updatedAt: iso(2) },
  { id: "l5", fullName: "Ananya Das", email: "ananya.das@quillmark.co", mobile: "+91 91234 56780", companyName: "Quillmark Media", designation: "Marketing Director", priority: "medium", temperature: "warm", leadScore: 63, value: 210000, probability: 50, statusId: "s2", assignedTo: "u4", tags: ["media"], createdAt: iso(9), updatedAt: iso(3) },
  { id: "l6", fullName: "Rahul Bose", email: "rahul.bose@nimbusretail.com", mobile: "+91 90000 22334", companyName: "Nimbus Retail", designation: "Ops Manager", priority: "high", temperature: "warm", leadScore: 71, value: 340000, probability: 55, statusId: "s3", assignedTo: "u2", tags: ["retail"], createdAt: iso(14), updatedAt: iso(2) },
  { id: "l7", fullName: "Ishita Malhotra", email: "ishita@malhotraconsulting.com", mobile: "+91 99887 65432", companyName: "Malhotra Consulting", priority: "medium", temperature: "cold", leadScore: 40, value: 95000, probability: 20, statusId: "s6", assignedTo: "u3", tags: ["consulting"], description: "Went with a competitor's bundled offer.", createdAt: iso(25), updatedAt: iso(6) },
  { id: "l8", fullName: "Devansh Gupta", email: "devansh@gtechsolutions.in", mobile: "+91 98700 11009", companyName: "GTech Solutions", designation: "CTO", website: "gtechsolutions.in", priority: "urgent", temperature: "hot", leadScore: 88, value: 720000, probability: 75, statusId: "s4", assignedTo: "u1", tags: ["enterprise", "tech"], createdAt: iso(20), updatedAt: iso(1) },
  { id: "l9", fullName: "Naina Chawla", email: "naina.chawla@urbannest.com", mobile: "+91 90111 22556", companyName: "Urban Nest Interiors", priority: "low", temperature: "warm", leadScore: 48, value: 150000, probability: 35, statusId: "s2", assignedTo: "u4", tags: ["design"], createdAt: iso(6), updatedAt: iso(5) },
  { id: "l10", fullName: "Yash Thakur", email: "yash@thakurlogistics.com", mobile: "+91 98230 99887", companyName: "Thakur Logistics", designation: "Director", priority: "medium", temperature: "warm", leadScore: 59, value: 280000, probability: 45, statusId: "s3", assignedTo: "u2", tags: ["logistics"], createdAt: iso(11), updatedAt: iso(4) },
  { id: "l11", fullName: "Pooja Reddy", email: "pooja.reddy@sunridgehealth.com", mobile: "+91 91500 33221", companyName: "Sunridge Health", designation: "COO", website: "sunridgehealth.com", priority: "high", temperature: "hot", leadScore: 85, value: 610000, probability: 80, statusId: "s5", assignedTo: "u1", tags: ["healthcare", "enterprise"], description: "Signed. Onboarding kicks off next quarter.", createdAt: iso(40), updatedAt: iso(2) },
  { id: "l12", fullName: "Farhan Ali", email: "farhan@alienterprises.co", mobile: "+91 98456 11278", companyName: "Ali Enterprises", priority: "low", temperature: "cold", leadScore: 18, value: 40000, probability: 5, statusId: "s6", assignedTo: "u3", tags: [], description: "Budget frozen for this fiscal year.", createdAt: iso(28), updatedAt: iso(10) },
  { id: "l13", fullName: "Kavya Menon", email: "kavya.menon@brightbyte.io", mobile: "+91 90980 44112", companyName: "BrightByte Labs", designation: "Product Lead", priority: "medium", temperature: "warm", leadScore: 66, value: 190000, probability: 50, statusId: "s1", assignedTo: "u4", tags: ["ads"], createdAt: iso(1), updatedAt: iso(1) },
  { id: "l14", fullName: "Siddharth Nair", email: "siddharth@nairfoods.in", mobile: "+91 99456 78123", companyName: "Nair Foods", priority: "medium", temperature: "warm", leadScore: 52, value: 130000, probability: 40, statusId: "s2", assignedTo: "u2", tags: ["fmcg"], createdAt: iso(7), updatedAt: iso(2) },
  { id: "l15", fullName: "Riya Kulkarni", email: "riya.kulkarni@pixelforge.studio", mobile: "+91 90876 54321", companyName: "PixelForge Studio", designation: "Founder", website: "pixelforge.studio", priority: "high", temperature: "hot", leadScore: 79, value: 260000, probability: 65, statusId: "s4", assignedTo: "u1", tags: ["creative"], createdAt: iso(16), updatedAt: iso(1) },
];

const owner = (id: string) => DEMO_OWNERS.find((o) => o.id === id)?.fullName ?? "Unknown";

export const DEMO_ACTIVITIES: LeadActivity[] = [
  { id: "a1", leadId: "l1", activityType: "call", subject: "Discovery call", description: "Discussed rollout timeline and ads budget.", createdBy: "u1", createdAt: iso(10) },
  { id: "a2", leadId: "l1", activityType: "email", subject: "Sent pricing deck", createdBy: "u1", createdAt: iso(6) },
  { id: "a3", leadId: "l1", activityType: "note", subject: `Stage changed from New to Qualified`, createdBy: owner("u1"), createdAt: iso(1) },
  { id: "a4", leadId: "l3", activityType: "meeting", subject: "Contract walkthrough", description: "Walked legal through the SLA terms.", createdBy: "u1", createdAt: iso(3) },
  { id: "a5", leadId: "l3", activityType: "demo", subject: "Product demo for exec team", createdBy: "u1", createdAt: iso(12) },
  { id: "a6", leadId: "l8", activityType: "whatsapp", subject: "Follow-up on integration questions", createdBy: "u1", createdAt: iso(2) },
  { id: "a7", leadId: "l11", activityType: "note", subject: "Deal closed — moved to Won", createdBy: "u1", createdAt: iso(2) },
];

export const DEMO_NOTES: LeadNote[] = [
  { id: "n1", leadId: "l1", note: "Prefers async updates over calls — email first.", createdBy: "u1", createdAt: iso(9), updatedAt: iso(9) },
  { id: "n2", leadId: "l3", note: "Decision maker is the VP Sales, not procurement. CC her on every email.", createdBy: "u1", createdAt: iso(15), updatedAt: iso(5) },
  { id: "n3", leadId: "l8", note: "Technical evaluation happening in parallel with a competitor.", createdBy: "u1", createdAt: iso(8), updatedAt: iso(8) },
];

export const ownerName = owner;
