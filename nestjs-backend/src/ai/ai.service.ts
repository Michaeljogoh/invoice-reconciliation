import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface AiExplanationRequest {
  invoice: {
    id: string;
    amount: number;
    date: Date;
    description?: string;
    vendorName?: string;
    invoiceNumber?: string;
  };
  transaction: {
    id: string;
    amount: number;
    date: Date;
    description: string;
    reference?: string;
  };
  score: number;
  scoreBreakdown: {
    exactAmount: number;
    dateProximity: number;
    textSimilarity: number;
    vendorMatch?: number;
    total: number;
  };
}

export interface AiExplanationResponse {
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  aiGenerated: boolean;
}

@Injectable()
export class AiService {
  private openai: OpenAI | null = null;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    const apiKey = configService.get<string>('AI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
    }
  }

  async generateExplanation(
    request: AiExplanationRequest
  ): Promise<AiExplanationResponse> {
    // Use AI if available and configured
    if (this.openai && this.configService.get<string>('AI_PROVIDER') !== 'mock') {
      try {
        return await this.generateOpenAIExplanation(request);
      } catch (error) {
        this.logger.warn(`AI generation failed: ${error.message}. Falling back to deterministic explanation.`);
      }
    }

    // Fallback to deterministic explanation
    return this.generateDeterministicExplanation(request);
  }

  private async generateOpenAIExplanation(
    request: AiExplanationRequest
  ): Promise<AiExplanationResponse> {
    const prompt = this.buildPrompt(request);

    const completion = await this.openai.chat.completions.create({
      model: this.configService.get<string>('AI_MODEL', 'gpt-4'),
      messages: [
        {
          role: 'system',
          content: 'You are a financial reconciliation expert. Provide clear, concise explanations for why an invoice and bank transaction might match. Focus on amounts, dates, and descriptions. Keep responses to 2-4 sentences.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.configService.get<number>('AI_MAX_TOKENS', 150),
      temperature: 0.3,
    });

    const explanation = completion.choices[0]?.message?.content?.trim();

    if (!explanation) {
      throw new Error('No explanation generated');
    }

    return {
      explanation,
      confidence: this.determineConfidence(request.score),
      aiGenerated: true,
    };
  }

  private generateDeterministicExplanation(
    request: AiExplanationRequest
  ): AiExplanationResponse {
    const { invoice, transaction, score, scoreBreakdown } = request;
    let explanation = '';

    // Perfect match
    if (scoreBreakdown.exactAmount >= 1000) {
      explanation = `Perfect match: Invoice ${invoice.invoiceNumber || invoice.id} and transaction ${transaction.reference || transaction.id} have identical amounts of ${invoice.amount.toFixed(2)} ${this.getCurrency()}.`;
    }
    // Strong match
    else if (score >= 1200) {
      const reasons = [];
      if (scoreBreakdown.dateProximity >= 200) reasons.push('similar dates');
      if (scoreBreakdown.textSimilarity >= 100) reasons.push('matching descriptions');
      
      explanation = `Strong match: Amount ${invoice.amount.toFixed(2)} ${this.getCurrency()} with ${reasons.join(' and ')}.`;
    }
    // Good match
    else if (score >= 800) {
      explanation = `Good match: Amounts are close (${invoice.amount.toFixed(2)} vs ${transaction.amount.toFixed(2)}) with reasonable date proximity.`;
    }
    // Weak match
    else if (score >= 400) {
      explanation = `Potential match: Some similarities found but requires review.`;
    }
    // Poor match
    else {
      explanation = `Low confidence match: Minimal similarities detected.`;
    }

    return {
      explanation,
      confidence: this.determineConfidence(score),
      aiGenerated: false,
    };
  }

  private buildPrompt(request: AiExplanationRequest): string {
    const { invoice, transaction, score, scoreBreakdown } = request;
    
    return `Explain why this invoice and bank transaction might be a match:

Invoice:
- Amount: ${invoice.amount.toFixed(2)}
- Date: ${invoice.date.toDateString()}
- Description: ${invoice.description || 'N/A'}
- Vendor: ${invoice.vendorName || 'N/A'}
- Invoice Number: ${invoice.invoiceNumber || 'N/A'}

Bank Transaction:
- Amount: ${transaction.amount.toFixed(2)}
- Date: ${transaction.date.toDateString()}
- Description: ${transaction.description}
- Reference: ${transaction.reference || 'N/A'}

Scoring:
- Total Score: ${score}/1500
- Exact Amount Match: ${scoreBreakdown.exactAmount > 0 ? 'Yes' : 'No'}
- Date Proximity Score: ${scoreBreakdown.dateProximity}/300
- Text Similarity Score: ${scoreBreakdown.textSimilarity}/200
- Vendor Match Score: ${scoreBreakdown.vendorMatch || 0}/100

Provide a concise explanation (2-4 sentences) of why these are likely the same transaction.`;
  }

  private determineConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 1200) return 'high';
    if (score >= 600) return 'medium';
    return 'low';
  }

  private getCurrency(): string {
    return 'USD'; // Could be made configurable
  }

  async isAiAvailable(): Promise<boolean> {
    return !!(this.openai && this.configService.get<string>('AI_PROVIDER') !== 'mock');
  }
}