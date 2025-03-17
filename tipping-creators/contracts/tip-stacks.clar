;; ;; ;; Title: Tip-stacks 
;; ;; ;; Description: Decentralized tipping platform with advanced features

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;; Constants ;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
(define-constant CONTRACT_OWNER 'STFPYA06K2F5BY0ESPY7HMK70WEAEXBFF20HGPYX)
(define-constant PLATFORM_FEE_PERCENTAGE u5)
(define-constant MAX_TIP_AMOUNT u1000000000)  ;; 1000 STX
(define-constant REWARD_THRESHOLD u1000000)   ;; 1 STX
(define-constant REWARD_RATE u10)
(define-constant ALLOWED_TOKENS (list 
    "STX" 
    "BTC" 
))