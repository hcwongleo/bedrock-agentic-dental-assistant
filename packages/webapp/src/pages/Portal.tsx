import { 
    Container, 
    Header, 
    ColumnLayout, 
    Box, 
    SpaceBetween,
    StatusIndicator,
    Button,
    BreadcrumbGroup,
    AppLayout,
    Link,
    Table
} from "@cloudscape-design/components";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useS3ListItems, fetchJsonFromPath } from "../hooks/useStorage";
import { QUERY_KEYS } from "../utils/types";
import { ApprovalForm } from "../components/ApprovalForm";

interface DentalOrderData {
    order_id: string;
    dentist_name: string;
    patient_id: string;
    order_priority: string;
    phone: string;
    dental_practice: string;
    order_date: string;
    delivery_date: string;
    email: string;
    tooth_position: string;
    product: string;
    material_category: string;
    material: string;
    shade: string;
    pontic_design: string;
    special_instructions: string;
    status: string;
    timestamp: string;
}

export const Portal = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    const [orderData, setOrderData] = useState<DentalOrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { data: orderItems, isLoading: ordersLoading } = useS3ListItems(QUERY_KEYS.ORDERS);
    const [splitPanelOpen, setSplitPanelOpen] = useState(false);
    const [showApprovalForm, setShowApprovalForm] = useState(false);
    const [formData, setFormData] = useState<any>(null);

    const handleGenerateClick = () => {
        const initialFormData = {
            date: new Date().toISOString().split('T')[0],
            dentistName: orderData?.dentist_name || '',
            patientId: orderData?.patient_id || '',
            dentalPractice: orderData?.dental_practice || '',
            orderDate: orderData?.order_date || new Date().toISOString().split('T')[0],
            deliveryDate: orderData?.delivery_date || '',
            product: orderData?.product || '',
            toothPosition: orderData?.tooth_position || '',
            material: `${orderData?.material_category || ''} ${orderData?.material || ''}`.trim(),
            shade: orderData?.shade || '',
            ponticDesign: orderData?.pontic_design || '',
            specialInstructions: orderData?.special_instructions || ''
        };
        setShowApprovalForm(true);
        setSplitPanelOpen(true);
        setFormData(initialFormData);
    };

    const handlePreview = (formData: any) => {
        console.log('Preview data:', formData);
    };

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                setError(null);
                
                if (!orderId) {
                    setError("No order ID provided");
                    setLoading(false);
                    return;
                }
                
                console.log('Order ID:', orderId);
                console.log('Order Items:', orderItems);
                
                if (orderItems && orderItems.length > 0) {
                    for (const item of orderItems) {
                        const fullPath = `${item.path}${item.itemName}`;
                        console.log('Checking order at path:', fullPath);
                        
                        try {
                            const jsonData = await fetchJsonFromPath(fullPath);
                            console.log('Order data:', jsonData);
                            
                            if (jsonData && typeof jsonData !== 'string') {
                                const currentOrderId = jsonData.order_id;
                                console.log('Comparing order IDs:', currentOrderId, orderId);
                                
                                if (currentOrderId === orderId) {
                                    console.log('Found matching order:', jsonData);
                                    setOrderData(jsonData);
                                    setLoading(false);
                                    return;
                                }
                            }
                        } catch (err) {
                            console.error('Error fetching order:', err);
                        }
                    }
                }
                
                setError(`Order with ID ${orderId} not found`);
                setLoading(false);
            } catch (error) {
                console.error('Error in fetchOrder:', error);
                setError('Failed to load order details');
                setLoading(false);
            }
        };
        
        fetchOrder();
    }, [orderId, orderItems]);

    if (loading || ordersLoading) {
        return (
            <Container>
                <Header variant="h2">Loading order details...</Header>
            </Container>
        );
    }

    if (error || !orderData) {
        return (
            <Container>
                <SpaceBetween size="l">
                    <Header variant="h2">
                        {error === "No order ID provided" 
                            ? "Please select an order from the order list to view details"
                            : `Error: ${error || 'Failed to load order details'}`}
                    </Header>
                    <Button onClick={() => navigate('/review')}>Back to Order List</Button>
                </SpaceBetween>
            </Container>
        );
    }

    return(
        <AppLayout
            content={
                <SpaceBetween size="l">
                    <BreadcrumbGroup
                        items={[
                            { text: "Dental Order Processing", href: "/" },
                            { text: "Dental Order List", href: "/review" },
                            { text: orderId || 'Order Details', href: "#" }
                        ]}
                        ariaLabel="Breadcrumbs"
                    />

                    <Container header={<Header variant="h2">Order overview</Header>}>
                        <ColumnLayout columns={4} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Dentist name</Box>
                                <Box variant="p">
                                    {orderData.dentist_name || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Patient ID</Box>
                                <Box variant="p">
                                    {orderData.patient_id || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Order priority</Box>
                                <Box variant="p">
                                    {orderData.order_priority || 'Standard'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Phone</Box>
                                <Box variant="p">
                                    {orderData.phone || '-'}
                                </Box>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Dental practice</Box>
                                <Box variant="p">
                                    {orderData.dental_practice || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Order date</Box>
                                <Box variant="p">
                                    {orderData.order_date || 
                                     (orderData.timestamp ? new Date(orderData.timestamp).toLocaleDateString() : '-')}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Required delivery date</Box>
                                <Box variant="p">
                                    {orderData.delivery_date || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Email</Box>
                                <Box variant="p">
                                    {orderData.email || '-'}
                                </Box>
                            </div>
                        </ColumnLayout>
                    </Container>

                    <Container header={<Header variant="h2">Order details</Header>}>
                        <ColumnLayout columns={4} variant="text-grid">
                            <div>
                                <Box variant="awsui-key-label">Tooth Position</Box>
                                <Box variant="p">
                                    {orderData.tooth_position || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Product Type</Box>
                                <Box variant="p">
                                    {orderData.product || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Material Category</Box>
                                <Box variant="p">
                                    {orderData.material_category || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Material</Box>
                                <Box variant="p">
                                    {orderData.material || '-'}
                                </Box>
                            </div>

                            <div>
                                <Box variant="awsui-key-label">Shade</Box>
                                <Box variant="p">
                                    {orderData.shade || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Pontic Design</Box>
                                <Box variant="p">
                                    {orderData.pontic_design || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Special Instructions</Box>
                                <Box variant="p">
                                    {orderData.special_instructions || '-'}
                                </Box>
                            </div>
                            <div>
                                <Box variant="awsui-key-label">Verification Status</Box>
                                <Box variant="p">
                                    <StatusIndicator type="success">
                                        {orderData.status || 'Verified'}
                                    </StatusIndicator>
                                </Box>
                            </div>
                        </ColumnLayout>
                    </Container>

                    <Container
                        header={
                            <Header variant="h2">
                                Order Documents
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
                                            {orderData?.summary?.analysis || '-'}
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
                                            <Button 
                                                iconAlign="right" 
                                                iconName="gen-ai" 
                                                onClick={handleGenerateClick}
                                            >
                                                Generate
                                            </Button>
                                        </SpaceBetween>
                                    ),
                                    minWidth: 180
                                }
                            ]}
                            items={[
                                {
                                    documentName: "Dental Order Confirmation",
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

                    <Container>
                        <Button onClick={() => navigate('/review')}>Back to Order List</Button>
                    </Container>
                </SpaceBetween>
            }
            splitPanelOpen={splitPanelOpen}
            splitPanel={
                showApprovalForm && (
                    <ApprovalForm 
                        initialData={formData}
                        onPreview={handlePreview}
                        onCancel={() => {
                            setShowApprovalForm(false);
                            setSplitPanelOpen(false);
                        }}
                    />
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
