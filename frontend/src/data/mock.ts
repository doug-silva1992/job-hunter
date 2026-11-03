export type Stage = 'found' | 'applied' | 'interview' | 'offer'

export type Job = {
  id: number
  company: string
  role: string
  location: string
  workMode: 'Remoto' | 'Híbrido' | 'Presencial'
  match: number
  tags: string[]
  postedAt: string
  stage: Stage
}

export const stages: { id: Stage; label: string; color: string }[] = [
  { id: 'found', label: 'Encontradas', color: '#5E6C84' },
  { id: 'applied', label: 'Candidatado', color: '#0A66C2' },
  { id: 'interview', label: 'Entrevista', color: '#B26A00' },
  { id: 'offer', label: 'Oferta', color: '#057642' },
]

// Dados fictícios para a tela inicial, até existir integração com o backend.
export const initialJobs: Job[] = [
  { id: 1, company: 'Acme Pay', role: 'Senior Frontend Engineer', location: 'São Paulo, SP', workMode: 'Remoto', match: 94, tags: ['React', 'TypeScript', 'GraphQL'], postedAt: 'há 2h', stage: 'found' },
  { id: 2, company: 'Orbita Tech', role: 'Fullstack Developer (Node/React)', location: 'Campinas, SP', workMode: 'Híbrido', match: 88, tags: ['Node.js', 'React', 'AWS'], postedAt: 'há 5h', stage: 'found' },
  { id: 3, company: 'Kappa Bank', role: 'Backend Engineer – NestJS', location: 'Rio de Janeiro, RJ', workMode: 'Remoto', match: 82, tags: ['NestJS', 'PostgreSQL', 'Docker'], postedAt: 'há 1d', stage: 'found' },
  { id: 4, company: 'Nimbus Cloud', role: 'Software Engineer II', location: 'Osasco, SP', workMode: 'Híbrido', match: 76, tags: ['Go', 'Kubernetes'], postedAt: 'há 1d', stage: 'found' },
  { id: 5, company: 'Lumen Labs', role: 'Frontend Developer Pleno', location: 'Curitiba, PR', workMode: 'Remoto', match: 71, tags: ['Vue', 'TypeScript', 'Jest'], postedAt: 'há 2d', stage: 'found' },
  { id: 6, company: 'Vortex Data', role: 'Tech Lead Frontend', location: 'São Paulo, SP', workMode: 'Presencial', match: 64, tags: ['React', 'Micro-frontends'], postedAt: 'há 3d', stage: 'found' },
  { id: 7, company: 'Helix Health', role: 'Senior React Developer', location: 'Porto Alegre, RS', workMode: 'Remoto', match: 90, tags: ['React', 'Next.js'], postedAt: 'há 4d', stage: 'applied' },
  { id: 8, company: 'Quanta Retail', role: 'Software Engineer – Platform', location: 'Recife, PE', workMode: 'Remoto', match: 85, tags: ['TypeScript', 'Node.js'], postedAt: 'há 6d', stage: 'applied' },
  { id: 9, company: 'Prisma Edu', role: 'Fullstack Engineer', location: 'São Paulo, SP', workMode: 'Híbrido', match: 79, tags: ['React', 'Python'], postedAt: 'há 1sem', stage: 'applied' },
  { id: 10, company: 'Atlas Games', role: 'Frontend Engineer', location: 'Belo Horizonte, MG', workMode: 'Remoto', match: 87, tags: ['React', 'Design System'], postedAt: 'há 1sem', stage: 'interview' },
  { id: 11, company: 'Zenith Mobility', role: 'Senior Web Developer', location: 'Florianópolis, SC', workMode: 'Remoto', match: 81, tags: ['TypeScript', 'WebGL'], postedAt: 'há 2sem', stage: 'interview' },
  { id: 12, company: 'Polar Systems', role: 'Desenvolvedor React Sênior', location: 'Campinas, SP', workMode: 'Remoto', match: 92, tags: ['React', 'Node.js'], postedAt: 'há 3sem', stage: 'offer' },
]

