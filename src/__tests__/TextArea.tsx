import { render, fireEvent } from '@testing-library/react-native'
import TextArea from '../components/TextArea'

xdescribe('<TextArea>', () => {
  
  test('should call onChange', () => {
    const onChange = jest.fn()
    const { getByPlaceholderText } = render(<TextArea 
      onChange={onChange} 
      value={'Text value'} 
      placeholder='message placeholder'
      maxLength={50}
    />)
    const textInput = getByPlaceholderText('message placeholder')
    fireEvent.changeText(textInput, 'test message')
    expect(onChange).toHaveBeenCalledWith('test message')
  })
  
  test('should set initial value', () => {
    const onChange = jest.fn()
    const { getByPlaceholderText } = render(<TextArea 
      onChange={onChange} 
      value={'Text value'} 
      placeholder='message placeholder'
      maxLength={50}
    />)
    const textInput = getByPlaceholderText('message placeholder')
    expect(textInput.props.value).toBe('Text value')
  })

  test('should cut off string longer than maxLength', () => {
    const { getByPlaceholderText } = render(<TextArea 
      value={'Text value'} 
      placeholder='message placeholder'
      maxLength={50}
    />)

    const textInput = getByPlaceholderText('message placeholder')
    fireEvent.changeText(textInput, 'test message test message test message test message test message test message test message test message test message')

    expect(textInput.props.value).toBe('test message test message test message test messag')
  });
})