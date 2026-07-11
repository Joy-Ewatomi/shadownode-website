import { estimatePrice } from '@/lib/pricing';

export async function POST(request: Request) {
  try {
    const { serviceType, description, timeline } = await request.json();

    // Validate input
    if (!serviceType || !description || !timeline) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (description.trim().length < 20) {
      return Response.json(
        { error: 'Description must be at least 20 characters' },
        { status: 400 }
      );
    }

    const estimate = estimatePrice({
      serviceType,
      description,
      timeline,
    });

    return Response.json(estimate);
  } catch (error) {
    console.error('Pricing estimation error:', error);
    return Response.json(
      { error: 'Failed to estimate price' },
      { status: 500 }
    );
  }
}
