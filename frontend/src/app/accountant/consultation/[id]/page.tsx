interface Props {
  params: Promise<{ id: string }>;
}

export default async function AccountantConsultationDetailPage({ params }: Props) {
  const { id } = await params;
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Consultation Details</h1>
      <p className="text-gray-64 text-sm mt-1">Consultation ID: {id}</p>
    </div>
  );
}