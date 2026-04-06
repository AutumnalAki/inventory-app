import ClientPortalGenericRequisitionForm from "@/components/requisition/ClientPortalGenericRequisitionForm";

export default function RequisitionMobileGenericTestPage() {
  return (
    <div className="min-h-screen bg-[#060606] px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto mb-4 w-full max-w-6xl rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Developer Test: Generic Requisition Form</h1>
        <p className="mt-1 text-sm text-gray-400">
          Test page for the mobile-friendly client portal form with live printable requisition preview.
        </p>
      </div>

      <ClientPortalGenericRequisitionForm
        showLivePrintablePreview
        previewDefaultOpen
      />
    </div>
  );
}
