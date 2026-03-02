export interface SearchResult {
  title: string;
  url: string;
  summary: string;
  author: string;
  time: string;
}

export interface ProblemListItem {
  id: string;
  title: string;
  difficulty: string;
  acceptRate: string;
  tags: string[];
}

export interface ProblemDetail {
  id: string;
  title: string;
  difficulty: string;
  timeLimit: string;
  memoryLimit: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  examples: string;
}

export interface ProblemSolution {
  author: string;
  title: string;
  summary: string;
  likes: string;
  url: string;
}

export interface TopicProblem {
  index: string;
  title: string;
  difficulty: string;
  acceptRate: string;
  url: string;
}

export interface DiscussionDetail {
  title: string;
  author: string;
  time: string;
  content: string;
  tags: string[];
  commentCount: string;
}

export interface InterviewPost {
  title: string;
  company: string;
  url: string;
  summary: string;
  time: string;
  author: string;
}

export interface HotTopic {
  title: string;
  url: string;
  summary: string;
  heat: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  count: number;
  has_more: boolean;
}
