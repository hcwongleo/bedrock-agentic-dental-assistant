import { 
    Container, 
    Header, 
    ColumnLayout, 
    Box, 
    SpaceBetween,
    StatusIndicator,
    Table,
    Button,
    BreadcrumbGroup,
    AppLayout,
    Link
} from "@cloudscape-design/components";
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Thumbnail } from '../components/Thumbnail';
import { useS3ListItems, fetchJsonFromPath } from "../hooks/useStorage";
import { QUERY_KEYS } from "../utils/types";
import { BDAResult } from '../utils/config';
import { DocPanel } from '../components/DocPanel';
import { ApprovalForm } from "../components/ApprovalForm";


export const Portal = () => {
    const { data: documentItems, isLoading: documentsLoading } = useS3ListItems(QUERY_KEYS.DOCUMENTS);
    const { applicationId } = useParams();
    const [applicationData, setApplicationData] = useState<any>(null);
    const [documentResults, setDocumentResults] = useState<Record<string, BDAResult>>({});
    const [loadingResults, setLoadingResults] = useState(true);
    const [sortingColumn, setSortingColumn] = useState({ sortingField: "timestamp" });
    const [sortingDescending, setSortingDescending] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);
    const [splitPanelOpen, setSplitPanelOpen] = useState(false);
    const [showApprovalForm, setShowApprovalForm] = useState(false);
    const [formData, setFormData] = useState<any>(null);

    const handleGenerateClick = () => {
        const initialFormData = {
            date: new Date().toISOString().split('T')[0],
            dentistName: applicationData.applicant_details.primary_borrower.name,
            dentalPractice: applicationData?.dental_practice || 'Smile Dental Clinic',
            patientId: applicationData?.patient_id || 'PT-12345',
            toothPosition: applicationData?.tooth_position || '14',
            productType: applicationData?.product_type || 'Crown',
            materialCategory: applicationData?.material_category || 'Metal Free',
            material: applicationData?.material || 'e.max',
            shade: applicationData?.shade || 'A2',
            ponticDesign: applicationData?.pontic_design || '-',
            specialInstructions: applicationData?.special_instructions || 'None',
            estimatedDeliveryDate: applicationData?.delivery_date || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]
        };
        setSelectedDocument(null); // Close document preview if open
        setShowApprovalForm(true);
        setSplitPanelOpen(true);
        setFormData(initialFormData);
    };

    const handlePreview = (formData: any) => {
        console.log('Preview data:', formData);
    };

    const findMatchingBdaFile = async (documentName: string) => {
        const baseName = documentName.replace(/\.[^/.]+$/, "").toLowerCase();
        const bdaFileName = `${baseName}-result.json`;
        console.log('Attempting to fetch BDA result:', bdaFileName);
        
        try {
            const bdaResult = await fetchJsonFromPath(`bda-result/${bdaFileName}`);
            if (bdaResult && typeof bdaResult === 'object') {
                // For BDA image results
                if (bdaResult.metadata?.semantic_modality === "IMAGE") {
                    console.log('Found valid image BDA result for:', documentName, bdaResult);
                    return bdaResult;
                }
                // For document analysis results
                else if (bdaResult.matched_blueprint && bdaResult.document_class?.type) {
                    console.log('Found valid document BDA result for:', documentName, bdaResult);
                    return bdaResult;
                }
            }
            
            console.log('Invalid or incomplete BDA result for:', documentName);
            return null;
        } catch (error) {
            console.log('No BDA result found for:', documentName);
            return null;
        }
    };

    const handleThumbnailClick = (item: any) => {
        console.log('Thumbnail clicked - Full item:', item);
        console.log('URL being passed:', item.url);
        
        // Maybe we need to construct the full URL
        const fullUrl = item.url;
        
        setSelectedDocument({
            url: fullUrl,
            name: item.itemName,
            type: getDocumentType(documentResults[item.itemName], item.documentName),
            aiAnalysis: documentResults[item.itemName]
        });
        setSplitPanelOpen(true);
    };

    const getDocumentType = (bdaResult: BDAResult | undefined, fallbackName: string) => {
        // Return "-" if no BDA result or no document_class.type
        if (!bdaResult || !bdaResult.document_class?.type) {
            return "-";
        }
        
        return bdaResult.document_class.type
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    useEffect(() => {
        const fetchBDAResults = async () => {
            if (!documentItems) return;
            setLoadingResults(true);
            const results: Record<string, BDAResult> = {};
            
            try {
                await Promise.all(documentItems.map(async (item) => {
                    const bdaResult = await findMatchingBdaFile(item.itemName);
                    if (bdaResult) {
                        results[item.itemName] = bdaResult;
                    }
                }));
                
                console.log('Final processed BDA results:', results);
                setDocumentResults(results);
            } catch (error) {
                console.error('Error in BDA results processing:', error);
            } finally {
                setLoadingResults(false);
            }
        };

        fetchBDAResults();
    }, [documentItems]);

    useEffect(() => {
        const fetchApplication = async () => {
            try {
                const data = await fetchJsonFromPath(`orders/${applicationId}.json`);
                setApplicationData(data);
            } catch (error) {
                console.error('Error fetching application:', error);
            }
        };
        fetchApplication();
    }, [applicationId]);

    if (!applicationData) return null;

    const getMaritalStatus = (data: any) => {
        return data?.applicant_details?.co_borrower?.name ? 'Married' : 'Single';
    };

    const getVerificationStatus = (bdaResult: BDAResult | undefined): {
        status: string;
        type: 'error' | 'warning' | 'success' | 'info' | 'pending' | 'in-progress';
    } => {
        if (bdaResult?.document_class?.type) {
            return {
                status: "Verified",
                type: "success"
            };
        }
        return {
            status: "Deprecated",
            type: "error"
        };
    };
    

    const getComments = (item: any) => {
        const bdaResult = documentResults[item.itemName];
        if (!bdaResult) return "-";
    
        const documentType = bdaResult?.document_class?.type;
    
        try {
            switch (documentType) {
                case 'bank-statement':
                    const bankDetails = bdaResult.inference_result;
                    if (!bankDetails) return "-";
                    
                    return `Name: ${bankDetails.account_name || 'N/A'}, ` + 
                           `Period: ${bankDetails.statement_period || 'N/A'}, ` + 
                           `Date: ${bankDetails.statement_date || 'N/A'}`;
    
                case 'US-drivers-licenses':
                    const license = bdaResult.inference_result;
                    if (!license?.NAME_DETAILS) return "-";
    
                    const fullName = `${license.NAME_DETAILS.FIRST_NAME} ${license.NAME_DETAILS.LAST_NAME}`;
                    const state = license.ADDRESS_DETAILS?.STATE || 'N/A';
                    const dob = license.DATE_OF_BIRTH ? 
                        new Date(license.DATE_OF_BIRTH).toLocaleDateString() : 'N/A';
                    
                    return `Name: ${fullName}, ` +
                           `DOB: ${dob}, ` +
                           `State: ${state}`;
    
                default:
                    // For other documents, show image summary if available
                    console.log(bdaResult)
                    return bdaResult?.image?.summary || "-";
            }
        } catch (error) {
            console.error('Error processing comments for:', item.itemName, error);
            return "-";
        }
    };
    
    return (
        <AppLayout
            content={
                <SpaceBetween size="l">
                    <BreadcrumbGroup
                        items={[
                            { text: "Dental Order Processing", href: "/" },
                            { 
                                text: "Dental Order List",
                                href: "/review",
                            },
                            { 
                                text: applicationId || 'Order Details',
                                href: "#" 
                            }
                        ]}
                        ariaLabel="Breadcrumbs"
                    />
    
                    <Container header={<Header variant="h2">Order overview</Header>}>
                        <ColumnLayout columns={4} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Dentist name</Box>
                                <Box variant="p">
                                    {applicationData.applicant_details.primary_borrower.name}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Patient ID</Box>
                                <Box variant="p">
                                    {applicationData?.patient_id || 'PT-12345'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Order priority</Box>
                                <Box variant="p">
                                    {applicationData?.order_priority || 'Standard'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Phone</Box>
                                <Box variant="p">
                                    123-456-789
                                </Box>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Dental practice</Box>
                                <Box variant="p">
                                    {applicationData?.dental_practice || 'Smile Dental Clinic'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Order date</Box>
                                <Box variant="p">
                                    {applicationData?.order_date || new Date().toLocaleDateString()}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Required delivery date</Box>
                                <Box variant="p">
                                    {applicationData?.delivery_date || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Email</Box>
                                <Box variant="p">
                                    dental@example.com
                                </Box>
                            </div>
                        </ColumnLayout>
                    </Container>
    
                    <Container header={<Header variant="h2">Order details</Header>}>
                        <ColumnLayout columns={4} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Tooth Position</Box>
                                <Box variant="p">
                                    {applicationData?.tooth_position || '14'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Product Type</Box>
                                <Box variant="p">
                                    {applicationData?.product_type || 'Crown'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Material Category</Box>
                                <Box variant="p">
                                    {applicationData?.material_category || 'Metal Free'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Material</Box>
                                <Box variant="p">
                                    {applicationData?.material || 'e.max'}
                                </Box>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Shade</Box>
                                <Box variant="p">
                                    {applicationData?.shade || 'A2'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Pontic Design</Box>
                                <Box variant="p">
                                    {applicationData?.pontic_design || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Special Instructions</Box>
                                <Box variant="p">
                                    {applicationData?.special_instructions || 'None'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Verification Status</Box>
                                <Box variant="p">
                                    <StatusIndicator type="success">
                                        Verified
                                    </StatusIndicator>
                                </Box>
                            </div>
                        </ColumnLayout>
                    </Container>
    
                    <Container 
                        header={
                            <Header variant="h2">
                                Dental Images & Files
                            </Header>
                        }
                    >
                        <Table
                            loading={documentsLoading || loadingResults}
                            contentDensity="compact"
                            wrapLines
                            columnDefinitions={[
                                { 
                                    id: "type",
                                    header: "Type",
                                    cell: item => getDocumentType(documentResults[item.itemName], item.documentName),
                                    minWidth: 180
                                },
                                { 
                                    id: "verificationStatus",
                                    header: "Verification Status",
                                    cell: item =>{
                                        const status = getVerificationStatus(documentResults[item.itemName]);
                                        return (
                                            <StatusIndicator type={status.type}>
                                                {status.status}
                                            </StatusIndicator>
                                        );
                                    },
                                    minWidth: 180
                                },
                                { 
                                    id: "thumbnail",
                                    header: (
                                        <SpaceBetween direction="horizontal" size="xxxs">
                                            <span>Thumbnail</span>
                                                <Button 
                                                    variant="inline-icon" 
                                                    iconName="expand"
                                                    ariaLabel="Expand to see the doc"
                                                />
                                        </SpaceBetween>
                                    ),
                                    cell: item => (
                                        <div 
                                            onClick={() => handleThumbnailClick(item)}
                                            style={{ 
                                                cursor: 'pointer',
                                                display: 'inline-block'
                                            }}
                                        >
                                            <Box>
                                                <Thumbnail 
                                                    url={item.url} 
                                                    documentName={item.itemName}
                                                />
                                            </Box>
                                        </div>
                                    ),
                                    minWidth: 250
                                },
                                
                                { 
                                    id: "confidenceScore",
                                    header: "AI Confidence Score",
                                    cell: item => {
                                        const bdaResult = documentResults[item.itemName];
                                        const confidence = bdaResult?.matched_blueprint?.confidence;
                                        if (confidence) {
                                            return `${(confidence * 100)}%`;
                                        }
                                        return '-';
                                    },
                                    minWidth: 160
                                },
                                {
                                    id: "comments",
                                    header: "Comments (AI-extracted)",
                                    cell: item => {
                                        const comment = getComments(item);
                                        return (
                                            <Box
                                                margin={{ left: 'xxxs', right: 'xxxs' }}
                                                display="inline"
                                            >
                                                {comment}
                                            </Box>
                                        );
                                    },
                                    minWidth: 200
                                }
                            ]}
                            items={documentItems?.map(item => ({
                                documentName: item.itemName.replace(/\.(png|pdf|jpg|jpeg)$/i, '').split('_').join(' '), // For display
                                itemName: item.itemName,
                                url: item.url,
                            })) || []}
                            variant="stacked"
                            sortingDisabled
                        />
                    </Container>
    
                    <Container
                        header={
                            <Header variant="h2">
                                Order Confirmation
                                <Link variant="info"> info</Link>
                            </Header>
                        }
                    >
                        <Table
                            columnDefinitions={[
                                {
                                    id: "documentName",
                                    header: "Document name",
                                    cell: item => item.documentName
                                },
                                {
                                    id: "brief",
                                    header: "AI-Generated Summary",
                                    cell: item => (
                                        <Box variant="p">
                                            {applicationData?.summary?.analysis || '-'}
                                        </Box>
                                    ),
                                    minWidth: 400
                                },
                                {
                                    id: "status",
                                    header: "Status",
                                    cell: item => (
                                        <StatusIndicator type="pending">
                                            Ready to generate
                                        </StatusIndicator>
                                    ),
                                    minWidth: 150
                                },
                                {
                                    id: "recipient",
                                    header: "Recipient",
                                    cell: item => item.recipient
                                },
                                {
                                    id: "action",
                                    header: "Action",
                                    cell: item => (
                                        <SpaceBetween direction="horizontal" size="xs">
                                            <Button iconAlign="right" iconName="gen-ai" ariaLabel="Generative AI - Normal button" onClick={handleGenerateClick} >
                                                Generate
                                            </Button>
                                        </SpaceBetween>
                                    ),
                                    minWidth: 180
                                }
                            ]}
                            items={[
                                {
                                    documentName: "Order Confirmation Letter",
                                    brief: "-",
                                    recipient: "Dentist"
                                }
                            ]}
                            variant="embedded"
                            wrapLines={true}
                            stripedRows
                            stickyHeader
                        />
                    </Container>
    
                    <Container
                        header={<Header variant="h2">
                            Action Log
                            <Link variant="info"> info</Link>
                            </Header>
                        }>
                        <Table
                            columnDefinitions={[
                                {
                                    id: "timestamp",
                                    header: "Timestamp",
                                    cell: item => item.timestamp,
                                    sortingField: "timestamp"
                                },
                                {
                                    id: "action",
                                    header: "Action",
                                    cell: item => item.action,
                                    sortingField: "action"
                                },
                                {
                                    id: "performedBy",
                                    header: "Performed by",
                                    cell: item => item.performedBy,
                                    sortingField: "performedBy"
                                },
                                {
                                    id: "details",
                                    header: "Details",
                                    cell: item => item.details,
                                    sortingField: "details"
                                }
                            ]}
                            items={(() => {
                                // Get base timestamp from application data
                                const baseTime = new Date(applicationData.timestamp);
                                
                                // Helper function to add minutes and format
                                const addMinutesAndFormat = (date: Date, minutes: number) => {
                                    const newDate = new Date(date.getTime() + minutes * 60000);
                                    return newDate.toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    }).replace(',', '');
                                };
                            
                                return [
                                    {
                                        timestamp: addMinutesAndFormat(baseTime, 0), // Original timestamp
                                        action: "Dental Order Received",
                                        performedBy: "Dentist",
                                        details: "Order submitted by dentist."
                                    },
                                    {
                                        timestamp: addMinutesAndFormat(baseTime, 30), // +30 minutes
                                        action: "Initial Review Completed",
                                        performedBy: "Dental Technician",
                                        details: "Verified tooth position and product compatibility."
                                    },
                                    {
                                        timestamp: addMinutesAndFormat(baseTime, 45), // +45 minutes
                                        action: "Confirmed order details",
                                        performedBy: "AI assistant & Dental Technician",
                                        details: "AI extracted order details; technician confirmed"
                                    },
                                    {
                                        timestamp: addMinutesAndFormat(baseTime, 59), // +59 minutes
                                        action: "Order Confirmation generated",
                                        performedBy: "AI assistant",
                                        details: "Order confirmation letter generated"
                                    }
                                ];
                            })()}
                            
                            variant="embedded"
                            stripedRows
                            sortingColumn={sortingColumn}
                            sortingDescending={sortingDescending}
                            // onSortingChange={({ detail }) => {
                            //     setSortingColumn(detail.sortingColumn);
                            //     setSortingDescending(detail.sortingDescending);
                            // }}
                            wrapLines={false}
                            contentDensity="compact"
                        />
                    </Container>
                </SpaceBetween>
            }
            splitPanelOpen={splitPanelOpen}
            splitPanel={
                showApprovalForm ? (
                    <ApprovalForm 
                        initialData={formData}
                        onPreview={handlePreview}
                        onCancel={() => {
                            setShowApprovalForm(false);
                            setSplitPanelOpen(false);
                        }
                      }
                    />
                ) : (
                    selectedDocument && (
                        <DocPanel
                            documentUrl={selectedDocument.url}
                            documentName={selectedDocument.name}
                            documentType={selectedDocument.type}
                            aiAnalysis={selectedDocument.aiAnalysis}
                        />
                    )
                )
            }
            splitPanelPreferences={{
                position: 'side'
            }}
            onSplitPanelToggle={({ detail }) => {
                setSplitPanelOpen(detail.open);
                if (!detail.open) {
                    setShowApprovalForm(false);
                }
            }}
            navigationOpen={false}
            toolsOpen={false}
            toolsHide={true} 
            navigationHide={true}
        />
    );
};
