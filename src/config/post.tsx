export interface IBlogPostSummary {
	title: string;
	created_at: number;
	updated_at: number;
	slug: string;
	summary: string;
	words: number;
}

export interface IBlogPostData {
	title: string;
	created_at: number;
	updated_at: number;
	content: string;
	words: number;
}
