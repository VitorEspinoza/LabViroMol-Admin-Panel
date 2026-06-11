export interface CreatedResponse {
  id: string;
}

// Posições

export interface Position {
  id: string;
  name: string;
  description: string;
}

export interface CreatePositionRequest {
  name: string;
  description: string;
}

// Parceiros

export interface Partner {
  id: string;
  name: string;
  description: string | null;
  createdAt?: string;
}

export interface PartnerRequest {
  name: string;
  description: string | null;
}

// Pesquisadores

export type DegreeLevel = 'Undergraduate' | 'Specialization' | 'Masters' | 'Doctorate' | 'PostDoctorate';

export interface Researcher {
  id: string;
  displayName: string;
  degreeLevel: DegreeLevel;
  position: string;
  lattesUrl: string | null;
}

// Projetos

export type ProjectStatus = 'Planned' | 'InProgress' | 'Completed' | 'Canceled';

export type ProjectRole = 'ResearchLead' | 'Manager' | 'Collaborator';

export interface ProjectMember {
  researcherId: string;
  researcherName: string;
  role: ProjectRole;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  partnerId: string;
  partnerName: string;
  members: ProjectMember[];
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  partnerName: string;
  managerName: string;
  status: ProjectStatus;
  createdAt: string;
}

export interface CreateProjectRequest {
  principalInvestigatorId: string;
  title: string;
  description: string;
  partnerId: string;
}

export interface UpdateProjectRequest {
  title: string;
  description: string;
  requestedById: string;
}

export interface ResearcherIdRequest {
  researcherId: string;
}

export interface AddProjectMemberRequest {
  researcherId: string;
  role: ProjectRole;
  requestedById: string;
}

export interface ChangeMemberRoleRequest {
  newRole: ProjectRole;
  requestedById: string;
}

export interface TransferLeadershipRequest {
  newLeadResearcherId: string;
  requestedById: string;
}

// Publicações

export interface PublicationAuthor {
  name: string;
  order: number;
}

export interface Publication {
  id: string;
  title: string;
  description: string;
  doi: string;
  publicationDate: string;
  publishedOn: string;
  publishUrl: string;
  authors: PublicationAuthor[];
  createdAt: string;
}

export interface PublicationSummary {
  id: string;
  title: string;
  doi: string;
  publicationDate: string;
  citationName: string;
}

export interface CreatePublicationRequest {
  title: string;
  description: string;
  doi: string;
  publicationDate: string;
  publishedOn: string;
  publishUrl: string;
}

export interface UpdatePublicationRequest {
  title: string;
  description: string;
  publishedOn: string;
  publishUrl: string;
}

export interface AddPublicationResearcherRequest {
  researcherId: string;
}

export interface ReorderPublicationResearchersRequest {
  researcherIds: string[];
}
