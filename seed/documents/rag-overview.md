# What is Retrieval-Augmented Generation (RAG)?

Retrieval-Augmented Generation (RAG) is an AI architecture that enhances Large Language Model (LLM) responses by grounding them in external knowledge sources. Instead of relying solely on the model's training data, RAG systems retrieve relevant documents at query time and include them as context for the LLM.

## How RAG Works

1. **Document Ingestion**: Documents are parsed, split into chunks, and converted to vector embeddings
2. **Query Processing**: User questions are converted to the same embedding space
3. **Retrieval**: The most semantically similar document chunks are retrieved from a vector database
4. **Generation**: The LLM generates an answer using both the query and retrieved context

## Benefits of RAG

- **Accuracy**: Responses are grounded in actual documents, reducing hallucinations
- **Currency**: Knowledge can be updated by adding new documents without retraining
- **Transparency**: Sources can be cited, making answers verifiable
- **Privacy**: Sensitive data stays in your infrastructure, never sent to external training pipelines
- **Cost**: Much cheaper than fine-tuning or training custom models

## Common Use Cases

- **Enterprise Knowledge Base**: Answer questions from internal documentation, policies, and procedures
- **Customer Support**: Provide accurate answers from product manuals and FAQs
- **Legal Research**: Search through case law, contracts, and regulations
- **Medical Literature**: Query research papers and clinical guidelines
- **Code Documentation**: Answer developer questions from API docs and code comments

## Advanced RAG Strategies

Modern RAG systems go beyond simple vector search:

- **Hybrid Search**: Combines dense vector search with sparse BM25 for better recall
- **Graph RAG**: Extracts entities and relationships to build a knowledge graph for structured reasoning
- **Agentic RAG**: Uses multi-step planning to break complex queries into sub-questions
- **Corrective RAG (CRAG)**: Grades retrieved documents and falls back to web search when needed
- **MemoRAG**: Builds a compressed memory of the entire corpus for global understanding
