import { DisplaySettings } from '@mui/icons-material';
import { Components } from '@mui/material/styles';

const commonComponents: Components = {
    MuiCssBaseline: {
        styleOverrides: {
            body: {
                /*Estilo Global do componente Box*/
                '& .MuiBox-root': {
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                },
            },
        },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: {
                backgroundColor: '#FFFFFF',
                borderRadius: "15px",
                '& fieldset': {
                    border: '1px solid #DDD'
                },
                '&:hover fieldset': {
                    border: '1px solid #1976D2'
                },
                '&.Mui-focused fieldset': {
                    border: '2px solid #1976D2'
                },
            },
        },
    },
    MuiButton: {
        defaultProps: {
            variant: 'contained',
            disableRipple: true,
            disableElevation: true,
            fullWidth: true,
        },
        styleOverrides: {
            root: {
                textTransform: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontWeight: 'bold',
                transition: '0.3s',
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundColor: "primary",
                borderRadius: "10px",
                padding: "14px",
                width: "100%",
                margin: "0 auto",
                boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)'
            },
        },
    },
    MuiTextField: {
        defaultProps: {
            margin: 'normal',
            fullWidth: true,
        },
        styleOverrides: {
            root: {
                borderRadius: '0px',
                marginBottom: '0px',
                '&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976D2',
                },
                width: '100%'
            },
        },
    },
    MuiTypography: {
        styleOverrides: {
            h1: {
                fontSize: '1.5rem',
                fontWeight: '550',
            },

            root: {
                fontSize: '1rem'
            }
        },
    },
};

export default commonComponents;
