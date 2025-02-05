import { Components } from '@mui/material/styles';

const commonComponents: Components = {
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
            },
        },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundColor: "primary",
                borderRadius: "10px",
                padding: "14px",
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
            },
        },
    },
    MuiTypography: {
        styleOverrides:{
            root:{
                h1: {
                    fontSize: "24px"
                }
            }
            
        }
    }
}
export default commonComponents;