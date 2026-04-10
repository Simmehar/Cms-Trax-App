import React, {PureComponent} from 'react';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

interface keyboardProps {
  children: any;
  contentContainerStyle: any;
}

const KeyboardScroll: React.FC<keyboardProps> = props => {
  return (
    <KeyboardAwareScrollView
      // extraHeight={}
      {...props}
      showsVerticalScrollIndicator={false}
      bounces={false}
      contentContainerStyle={props?.contentContainerStyle}
      keyboardShouldPersistTaps={'handled'}>
      {props.children}
    </KeyboardAwareScrollView>
  );
};

export {KeyboardScroll};

// export default class KeyboardScroll extends PureComponent {
//     constructor(props) {
//         super(props);
//     }

//     render() {
//         return (
//             <KeyboardAwareScrollView
//                 showsVerticalScrollIndicator={false}
//                 bounces={false}
//                 keyboardShouldPersistTaps={'handled'}
//                 {...this.props}
//             >
//                 {this.props.children}
//             </KeyboardAwareScrollView>
//         );
//     }
// }
